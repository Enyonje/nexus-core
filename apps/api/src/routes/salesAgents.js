
import { db } from "../db/db.js";
import { requireAuth } from "../security/authMiddleware.js";
import { executeSalesWorkflow } from "../agents/salesWorkflow.js";

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
    const interval=Math.max(6,Math.min(168,Number.parseInt(b.interval_hours,10)||24));
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
    // Run asynchronously after durable run record creation.
    setImmediate(()=>executeSalesWorkflow(run.id,{objective,market,ideal_customer:values[3],geography:values[4],max_leads:maxLeads}).catch(err=>server.log.error({err,runId:run.id},"Sales agent workflow failed")));
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
  server.get("/status",{preHandler:guard},async()=>{
    return {search_configured:Boolean(process.env.SERPAPI_API_KEY||process.env.SERPAPI_KEY),ai_configured:Boolean(process.env.OPENAI_API_KEY),
      required_environment:["OPENAI_API_KEY","SERPAPI_API_KEY"],
      agents:["Market Research Agent","Lead Discovery Agent","Lead Enrichment Agent","Lead Qualification Agent","Sales Intelligence Agent","Outreach Agent","Follow-up Agent","Opportunity Management Agent"]};
  });
}
