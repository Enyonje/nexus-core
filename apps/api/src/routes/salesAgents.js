
import { db } from "../db/db.js";
import { requireAuth } from "../security/authMiddleware.js";
import { enqueueSalesRun } from "../agents/salesAutopilot.js";
import { verifyEmailTransport } from "../services/mailer.js";

export default async function salesAgentsRoutes(server) {
  const admin = async (req, reply) => {
    if (req.user?.role !== "admin") return reply.code(403).send({error:"Admin only"});
  };
  const guard=[requireAuth,admin];

  server.get("/autopilot",{preHandler:guard},async()=>{
    const r=await db.query("SELECT * FROM sales_autopilot_config WHERE id=1");
    return {config:r.rows[0] || null};
  });
  server.put("/autopilot",{preHandler:guard},async(req,reply)=>{
    const b=req.body||{};
    const market=String(b.market||"").trim();
    if(b.enabled && market.length<2) return reply.code(400).send({error:"Configure a target market before enabling autopilot."});
    const interval=Math.max(1,Math.min(168,Number.parseInt(b.interval_hours,10)||12));
    const maxLeads=Math.max(1,Math.min(50,Number.parseInt(b.max_leads,10)||10));
    const enabled=Boolean(b.enabled);
    const values=[enabled,String(b.objective||"Find and qualify potential business customers for Nexus Core").slice(0,1000),market||"",String(b.ideal_customer||"").slice(0,1000)||null,String(b.geography||"").slice(0,200)||null,maxLeads,interval,req.user.id];
    const r=await db.query(`INSERT INTO sales_autopilot_config(id,enabled,objective,market,ideal_customer,geography,max_leads,interval_hours,updated_by,next_run_at)
      VALUES(1,$1,$2,$3,$4,$5,$6,$7,$8,CASE WHEN $1 THEN NOW() ELSE NULL END)
      ON CONFLICT(id) DO UPDATE SET enabled=EXCLUDED.enabled,objective=EXCLUDED.objective,market=EXCLUDED.market,
      ideal_customer=EXCLUDED.ideal_customer,geography=EXCLUDED.geography,max_leads=EXCLUDED.max_leads,
      interval_hours=EXCLUDED.interval_hours,updated_by=EXCLUDED.updated_by,
      next_run_at=CASE WHEN EXCLUDED.enabled THEN NOW() ELSE NULL END,updated_at=NOW() RETURNING *`,values);
    return {config:r.rows[0]};
  });

  server.post("/runs",{preHandler:guard},async(req,reply)=>{
    const b=req.body||{};
    const market=String(b.market||"").trim();
    if(market.length<2) return reply.code(400).send({error:"market is required"});
    const maxLeads=Math.max(1,Math.min(50,Number.parseInt(b.max_leads,10)||10));
    const objective=String(b.objective||"Find and qualify suitable business customers").slice(0,1000);
    const values=[req.user.id,objective,market,String(b.ideal_customer||"").slice(0,1000)||null,String(b.geography||"").slice(0,200)||null,maxLeads];
    const inserted=await db.query(`INSERT INTO sales_agent_runs(created_by,objective,market,ideal_customer,geography,max_leads) VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,values);
    const run=inserted.rows[0];
    await enqueueSalesRun(run.id,{objective,market,ideal_customer:values[3],geography:values[4],max_leads:maxLeads});
    return reply.code(202).send({run_id:run.id,status:"queued"});
  });
  server.get("/runs",{preHandler:guard},async()=>{
    const r=await db.query(`SELECT id,status,objective,market,geography,created_at,started_at,finished_at,error FROM sales_agent_runs ORDER BY created_at DESC LIMIT 30`);
    return {runs:r.rows};
  });
  server.get("/runs/:id",{preHandler:guard},async(req,reply)=>{
    const r=await db.query(`SELECT * FROM sales_agent_runs WHERE id=$1`,[req.params.id]);
    if(!r.rowCount) return reply.code(404).send({error:"Run not found"});
    const events=await db.query(`SELECT agent,event_type,message,payload,created_at FROM sales_agent_events WHERE run_id=$1 ORDER BY created_at`,[req.params.id]);
    return {run:r.rows[0],events:events.rows};
  });

  server.get("/followups",{preHandler:guard},async()=>{
    const r=await db.query(`SELECT f.*,l.company,l.name,l.email FROM sales_followups f JOIN sales_leads l ON l.id=f.lead_id ORDER BY (f.status='pending') DESC,f.due_at ASC LIMIT 200`);
    return {followups:r.rows};
  });
  server.patch("/followups/:id",{preHandler:guard},async(req,reply)=>{
    const status=String(req.body?.status||"");
    if(!["completed","cancelled","pending"].includes(status)) return reply.code(400).send({error:"Invalid follow-up status"});
    const r=await db.query(`UPDATE sales_followups SET status=$2,completed_at=CASE WHEN $2='completed' THEN NOW() ELSE NULL END WHERE id=$1 RETURNING *`,[req.params.id,status]);
    if(!r.rowCount) return reply.code(404).send({error:"Follow-up not found"});
    return {followup:r.rows[0]};
  });
  server.get("/outreach",{preHandler:guard},async()=>{
    const r=await db.query(`SELECT d.*,l.company,l.email FROM sales_outreach_drafts d JOIN sales_leads l ON l.id=d.lead_id ORDER BY d.created_at DESC LIMIT 200`);
    return {drafts:r.rows};
  });
  server.patch("/outreach/:id",{preHandler:guard},async(req,reply)=>{
    const status=String(req.body?.status||"");
    if(!["approved","rejected"].includes(status)) return reply.code(400).send({error:"Status must be approved or rejected"});
    const r=await db.query(`UPDATE sales_outreach_drafts SET status=$2,approved_by=$3,approved_at=CASE WHEN $2='approved' THEN NOW() ELSE NULL END WHERE id=$1 AND status='pending' RETURNING *`,[req.params.id,status,req.user.id]);
    if(r.rowCount) return {draft:r.rows[0]};

    const existing=await db.query(`SELECT * FROM sales_outreach_drafts WHERE id=$1`,[req.params.id]);
    if(!existing.rowCount) return reply.code(404).send({error:"Outreach draft not found"});

    if(existing.rows[0].status===status) return {draft:existing.rows[0]};

    return reply.code(409).send({
      error:`Draft is already ${existing.rows[0].status}.`,
      current_status:existing.rows[0].status
    });
  });
  server.post("/outreach/:id/send",{preHandler:guard},async(req,reply)=>{
    const {default:nodemailer}=await import("nodemailer");
    const r=await db.query(`SELECT d.*,l.email,l.company FROM sales_outreach_drafts d JOIN sales_leads l ON l.id=d.lead_id WHERE d.id=$1 AND d.status='approved'`,[req.params.id]);
    if(!r.rowCount) return reply.code(409).send({error:"Draft must be approved before sending"});
    const d=r.rows[0]; if(!d.email) return reply.code(400).send({error:"Lead has no verified email address"});
    if(!process.env.SMTP_HOST||!process.env.SMTP_FROM) return reply.code(503).send({error:"SMTP_HOST and SMTP_FROM must be configured"});
    try {
      const port=Number(process.env.SMTP_PORT||587);
      const transport=nodemailer.createTransport({host:process.env.SMTP_HOST,port,secure:process.env.SMTP_SECURE==="true"||port===465,...(process.env.SMTP_USER?{auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASS||""}}:{})});
      const sent=await transport.sendMail({from:process.env.SMTP_FROM,to:d.email,subject:d.subject,text:d.body});
      await db.query(`UPDATE sales_outreach_drafts SET status='sent',sent_at=NOW(),provider_message_id=$2,last_error=NULL WHERE id=$1`,[d.id,sent.messageId||null]);
      await db.query(`INSERT INTO sales_activities(lead_id,activity_type,title,details) VALUES($1,'email',$2,$3)`,[d.lead_id,`Approved outreach sent to ${d.email}`,d.subject]);
      return {sent:true,message_id:sent.messageId||null};
    } catch(e) { await db.query(`UPDATE sales_outreach_drafts SET last_error=$2 WHERE id=$1`,[d.id,String(e.message||e).slice(0,1000)]); return reply.code(502).send({error:"Email delivery failed",detail:String(e.message||e).slice(0,300)}); }
  });
  // Configure an inbound-email provider to POST parsed replies to this endpoint.
  server.post("/inbound-reply",async(req,reply)=>{
    const secret=process.env.SALES_INBOUND_WEBHOOK_SECRET;
    if(!secret || req.headers["x-sales-webhook-secret"]!==secret) return reply.code(401).send({error:"Unauthorized webhook"});
    const b=req.body||{}; const from=String(b.from_email||"").trim().toLowerCase(); const body=String(b.body||"").trim();
    if(!from||!body) return reply.code(400).send({error:"from_email and body are required"});
    const lead=await db.query(`SELECT id FROM sales_leads WHERE LOWER(email)=LOWER($1) LIMIT 1`,[from]);
    const classification=/unsubscribe|remove me|stop emailing/i.test(body)?"unsubscribe":/interested|book|demo|pricing|schedule/i.test(body)?"interested":"reply";
    const r=await db.query(`INSERT INTO sales_inbound_replies(lead_id,from_email,subject,body,provider_message_id,classification) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(provider_message_id) DO NOTHING RETURNING id`,[lead.rows[0]?.id||null,from,String(b.subject||"").slice(0,500),body.slice(0,20000),b.provider_message_id||null,classification]);
    if(lead.rowCount) await db.query(`INSERT INTO sales_activities(lead_id,activity_type,title,details) VALUES($1,'email',$2,$3)`,[lead.rows[0].id,`Inbound reply (${classification})`,body.slice(0,4000)]);
    return reply.code(202).send({received:Boolean(r.rowCount),classification,matched_lead:Boolean(lead.rowCount)});
  });
  server.get("/replies",{preHandler:guard},async()=>{
    const r=await db.query(`SELECT r.*,l.company FROM sales_inbound_replies r LEFT JOIN sales_leads l ON l.id=r.lead_id ORDER BY r.received_at DESC LIMIT 200`);
    return {replies:r.rows};
  });

  server.post("/smtp-test",{preHandler:guard},async(req,reply)=>{
    try {
      await verifyEmailTransport();
      return {verified:true,message:"SMTP connection verified successfully."};
    } catch(error) {
      req.log.error({err:error},"Sales SMTP verification failed");
      return reply.code(502).send({
        verified:false,
        error:"SMTP connection failed. Check SMTP settings in Render."
      });
    }
  });

  server.get("/status",{preHandler:guard},async()=>{
    const providers = [
      ["openai","OPENAI_API_KEY"],["gemini","GEMINI_API_KEY"],["anthropic","ANTHROPIC_API_KEY"],
      ["groq","GROQ_API_KEY"],["openrouter","OPENROUTER_API_KEY"],["deepseek","DEEPSEEK_API_KEY"],
      ["mistral","MISTRAL_API_KEY"],["together","TOGETHER_API_KEY"]
    ].filter(([,key])=>Boolean(String(process.env[key]||"").trim())).map(([name])=>name);
    return {search_configured:Boolean(process.env.SERPAPI_API_KEY||process.env.SERPAPI_KEY),ai_configured:providers.length>0,
      ai_provider_preference:process.env.AI_PROVIDER||"auto",configured_ai_providers:providers,
      required_environment:["SERPAPI_API_KEY","one or more AI provider API keys"],
      smtp_configured:Boolean(process.env.SMTP_HOST&&process.env.SMTP_FROM),
      inbound_reply_webhook_configured:Boolean(process.env.SALES_INBOUND_WEBHOOK_SECRET),
      agents:["Market Research Agent","Lead Discovery Agent","Lead Enrichment Agent","Lead Qualification Agent","Sales Intelligence Agent","Outreach Agent","Follow-up Agent","Opportunity Management Agent"]};
  });
}
