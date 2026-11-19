import { db } from "../db/db.js";
import { executeSalesWorkflow, generateSalesAIJSON } from "./salesWorkflow.js";

let scheduler = null;
let worker = null;
let closing = false;
let workerBusy = false;

// A durable queue: scheduled and manual runs enter the same PostgreSQL queue.
export async function enqueueSalesRun(runId, payload = {}) {
  await db.query(`INSERT INTO sales_agent_jobs(run_id,payload,status,available_at)
    VALUES($1,$2::jsonb,'queued',NOW()) ON CONFLICT(run_id) DO NOTHING`,
    [runId, JSON.stringify(payload)]);
}

async function scheduleDueRun(server) {
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const found = await client.query(`SELECT * FROM sales_autopilot_config
      WHERE enabled=TRUE AND next_run_at<=NOW() ORDER BY next_run_at FOR UPDATE SKIP LOCKED LIMIT 1`);
    if (!found.rowCount) { await client.query("COMMIT"); return; }
    const cfg = found.rows[0];
    const interval = Math.max(1, Number(cfg.interval_hours) || 12);
    const inserted = await client.query(`INSERT INTO sales_agent_runs(created_by,objective,market,ideal_customer,geography,max_leads)
      VALUES($1,$2,$3,$4,$5,$6) RETURNING id`,
      [cfg.updated_by || null,cfg.objective,cfg.market,cfg.ideal_customer,cfg.geography,cfg.max_leads]);
    const runId = inserted.rows[0].id;
    const payload = { objective:cfg.objective,market:cfg.market,ideal_customer:cfg.ideal_customer,geography:cfg.geography,max_leads:cfg.max_leads };
    await client.query(`INSERT INTO sales_agent_jobs(run_id,payload,status,available_at) VALUES($1,$2::jsonb,'queued',NOW()) ON CONFLICT(run_id) DO NOTHING`,[runId,JSON.stringify(payload)]);
    await client.query(`UPDATE sales_autopilot_config SET next_run_at=NOW()+($2 * INTERVAL '1 hour'),last_run_at=NOW(),updated_at=NOW() WHERE id=1`,[cfg.id,interval]);
    await client.query("COMMIT");
    server.log.info({runId,market:cfg.market},"Autonomous sales run queued");
  } catch (e) { try { await client.query("ROLLBACK"); } catch {} throw e; }
  finally { client.release(); }
}

async function claimJob() {
  const c = await db.connect();
  try {
    await c.query("BEGIN");
    // Recover abandoned leases after API restarts or worker crashes.
    await c.query(`UPDATE sales_agent_jobs SET status='queued',locked_at=NULL,locked_by=NULL,
      available_at=NOW(),last_error=COALESCE(last_error,'Worker lease expired; job recovered')
      WHERE status='running' AND locked_at < NOW()-INTERVAL '20 minutes'`);
    const r = await c.query(`SELECT * FROM sales_agent_jobs WHERE status='queued' AND available_at<=NOW()
      ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1`);
    if (!r.rowCount) { await c.query("COMMIT"); return null; }
    const job = r.rows[0];
    await c.query(`UPDATE sales_agent_jobs SET status='running',locked_at=NOW(),locked_by=$2,attempts=attempts+1 WHERE id=$1`,[job.id,`api-${process.pid}`]);
    await c.query("COMMIT");
    return { ...job, attempts: Number(job.attempts || 0) + 1 };
  } catch(e) { try { await c.query("ROLLBACK"); } catch {} throw e; }
  finally { c.release(); }
}

async function workOnce(server) {
  const job = await claimJob();
  if (!job) return false;
  const heartbeat=setInterval(()=>db.query(`UPDATE sales_agent_jobs SET locked_at=NOW() WHERE id=$1 AND status='running'`,[job.id]).catch(()=>{}),60_000);
  try {
    await executeSalesWorkflow(job.run_id, job.payload || {});
    await db.query(`UPDATE sales_agent_jobs SET status='completed',finished_at=NOW(),locked_at=NULL,locked_by=NULL,last_error=NULL WHERE id=$1`,[job.id]);
  } catch(e) {
    const retry = Number(job.attempts || 0) < 3;
    await db.query(`UPDATE sales_agent_jobs SET status=$2,available_at=CASE WHEN $2='queued' THEN NOW()+INTERVAL '5 minutes' ELSE available_at END,
      finished_at=CASE WHEN $2='failed' THEN NOW() ELSE NULL END,locked_at=NULL,locked_by=NULL,last_error=$3 WHERE id=$1`,
      [job.id,retry?'queued':'failed',String(e.message||e).slice(0,1000)]);
    server.log.error({err:e,runId:job.run_id,attempt:job.attempts},"Sales job execution failed");
  } finally { clearInterval(heartbeat); }
  return true;
}


async function processDueFollowup(server) {
  const c=await db.connect(); let task=null;
  try {
    await c.query("BEGIN");
    const r=await c.query(`SELECT f.*,l.name,l.company,l.email,l.website,l.qualification_reason,l.next_action,l.research
      FROM sales_followups f JOIN sales_leads l ON l.id=f.lead_id
      WHERE f.status='pending' AND f.due_at<=NOW() ORDER BY f.due_at FOR UPDATE OF f SKIP LOCKED LIMIT 1`);
    if(!r.rowCount){await c.query("COMMIT");return false;}
    task=r.rows[0];
    await c.query(`UPDATE sales_followups SET status='processing' WHERE id=$1`,[task.id]);
    await c.query("COMMIT");
  } catch(e){try{await c.query("ROLLBACK");}catch{} throw e;} finally{c.release();}
  try {
    const draft=await generateSalesAIJSON(
      "Write a concise, respectful B2B follow-up email. Return JSON {subject,body}. Use only supplied evidence. Do not invent prior conversations or promises. Include a clear opt-out-respecting tone.",
      {company:task.company,website:task.website,contact_name:task.name,qualification_reason:task.qualification_reason,next_action:task.next_action,research:task.research,followup_title:task.title,followup_details:task.details}
    );
    if(!draft.subject||!draft.body) throw new Error("AI returned an incomplete follow-up draft");
    await db.query(`INSERT INTO sales_outreach_drafts(lead_id,subject,body,personalization_evidence,status,followup_id)
      VALUES($1,$2,$3,$4,'pending',$5)`,[task.lead_id,String(draft.subject).slice(0,500),String(draft.body).slice(0,12000),"Generated from saved lead research and scheduled follow-up task.",task.id]);
    await db.query(`UPDATE sales_followups SET status='needs_approval' WHERE id=$1`,[task.id]);
    await db.query(`INSERT INTO sales_activities(lead_id,activity_type,title,details) VALUES($1,'note','Scheduled follow-up draft prepared',$2)`,[task.lead_id,`Draft awaits administrator approval: ${draft.subject}`]);
  } catch(e) {
    await db.query(`UPDATE sales_followups SET status='pending',due_at=NOW()+INTERVAL '15 minutes',details=COALESCE(details,'') || $2 WHERE id=$1`,[task.id,`\nRetry: ${String(e.message||e).slice(0,300)}`]);
    server.log.error({err:e,followupId:task.id},"Scheduled follow-up drafting failed");
  }
  return true;
}

export function startSalesAutopilot(server) {
  if (scheduler) return;
  closing = false;
  scheduler = setInterval(() => scheduleDueRun(server).catch(err=>server.log.error({err},"Sales scheduler error")), 30_000);
  worker = setInterval(async () => {
    if (closing || workerBusy) return;
    workerBusy = true;
    try {
      const didWork = await workOnce(server);
      if (!didWork) await processDueFollowup(server);
    } catch (err) {
      server.log.error({err}, "Sales worker error");
    } finally {
      workerBusy = false;
    }
  }, 5_000);
  scheduler.unref?.(); worker.unref?.();
  scheduleDueRun(server).catch(err=>server.log.error({err},"Initial sales schedule check failed"));
  server.addHook("onClose",async()=>{closing=true;clearInterval(scheduler);clearInterval(worker);scheduler=null;worker=null;});
  server.log.info("Persistent sales scheduler and PostgreSQL job worker started");
}
