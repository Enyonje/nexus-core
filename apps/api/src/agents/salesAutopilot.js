import { db } from "../db/db.js";
import { executeSalesWorkflow } from "./salesWorkflow.js";

let timer = null;
let busy = false;

// A durable database schedule. Multiple API instances coordinate through row locks.
export async function salesAutopilotTick(server) {
  if (busy) return;
  busy = true;
  let client;
  try {
    client = await db.connect();
    await client.query("BEGIN");
    const due = await client.query(`
      SELECT * FROM sales_autopilot_config
      WHERE enabled = TRUE AND next_run_at <= NOW()
      ORDER BY next_run_at ASC LIMIT 1 FOR UPDATE SKIP LOCKED
    `);
    if (!due.rowCount) { await client.query("COMMIT"); return; }
    const cfg = due.rows[0];
    const interval = Math.max(1, Number(cfg.interval_hours) || 24);
    await client.query(`UPDATE sales_autopilot_config SET next_run_at = NOW() + ($2 * INTERVAL '1 hour'), updated_at=NOW() WHERE id=$1`, [cfg.id, interval]);
    const inserted = await client.query(`
      INSERT INTO sales_agent_runs(created_by,objective,market,ideal_customer,geography,max_leads)
      VALUES($1,$2,$3,$4,$5,$6) RETURNING id
    `, [cfg.updated_by || null, cfg.objective, cfg.market, cfg.ideal_customer, cfg.geography, cfg.max_leads]);
    await client.query("COMMIT");
    const runId = inserted.rows[0].id;
    // The run is durable before execution; a crash leaves a visible run, not a lost schedule.
    executeSalesWorkflow(runId, {
      objective: cfg.objective, market: cfg.market, ideal_customer: cfg.ideal_customer,
      geography: cfg.geography, max_leads: cfg.max_leads
    }).catch(err => server.log.error({ err, runId }, "Autopilot sales run failed"));
    server.log.info({ runId, market: cfg.market }, "Autonomous sales workflow started");
  } catch (err) {
    if (client) { try { await client.query("ROLLBACK"); } catch {} }
    server.log.error({ err }, "Sales autopilot scheduler tick failed");
  } finally {
    client?.release();
    busy = false;
  }
}

export function startSalesAutopilot(server) {
  if (timer) return;
  // Check every 30 seconds. Database schedule and row lock make this safe across instances.
  timer = setInterval(() => salesAutopilotTick(server), 30_000);
  timer.unref?.();
  salesAutopilotTick(server);
  server.addHook("onClose", async () => { if (timer) clearInterval(timer); timer = null; });
  server.log.info("Sales autopilot scheduler initialized");
}
