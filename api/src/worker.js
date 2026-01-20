import { db } from "./db/db.js";
import { subscribe } from "./events/subscribe.js";
import { runSentinel } from "./agents/sentinel.js";
import { ensureSystemAgents } from "./agents/registry.js";
import { createContract, sendAgentMessage } from "./agents/a2a.js";
import { emitEvent } from "./events/stream.js";

console.log("🚀 Nexus Core Worker starting...");

(async () => {
  try {
    // Ensure system agents are registered before subscriptions
    await ensureSystemAgents();
    console.log("✅ System agents ensured");

    // Subscribe to GOAL_SUBMITTED events
    subscribe("GOAL_SUBMITTED", async (event) => {
      const client = await db.connect();
      try {
        await client.query("BEGIN");

        const { goalId } = event.payload;

        // Create execution
        const execRes = await client.query(
          `INSERT INTO executions (goal_id, status)
           VALUES ($1, 'running')
           RETURNING id`,
          [goalId]
        );
        const executionId = execRes.rows[0].id;

        emitEvent(executionId, {
          type: "EXECUTION_STARTED",
          executionId,
        });

        // Load agents
        const { rows: agents } = await client.query(`SELECT * FROM agents`);
        const architect = agents.find((a) => a.agent_type === "ARCHITECT");
        const apiWorker = agents.find((a) => a.name === "Worker-API");
        const dbWorker = agents.find((a) => a.name === "Worker-DB");

        if (!architect || !apiWorker || !dbWorker) {
          throw new Error("Required agents not found in registry");
        }

        // Architect plan step
        await client.query(
          `INSERT INTO execution_steps
             (execution_id, step_type, status, output, reasoning)
           VALUES ($1, 'ARCHITECT_PLAN', 'completed', $2, $3)`,
          [
            executionId,
            JSON.stringify({ plan: ["Provision API", "Setup DB"] }),
            JSON.stringify({ why: "Infrastructure required" }),
          ]
        );

        emitEvent(executionId, {
          type: "STEP_COMPLETED",
          step: "ARCHITECT_PLAN",
        });

        // API contract + message
        const apiContract = await createContract({
          executionId,
          requesterAgentId: architect.id,
          responderAgentId: apiWorker.id,
          contract: { task: "Provision API" },
        });

        await sendAgentMessage({
          contractId: apiContract,
          senderAgentId: apiWorker.id,
          message: { result: "API provisioned" },
        });

        emitEvent(executionId, {
          type: "AGENT_MESSAGE",
          agent: "Worker-API",
          result: "API provisioned",
        });

        // DB contract + message
        const dbContract = await createContract({
          executionId,
          requesterAgentId: architect.id,
          responderAgentId: dbWorker.id,
          contract: { task: "Initialize DB" },
        });

        await sendAgentMessage({
          contractId: dbContract,
          senderAgentId: dbWorker.id,
          message: { result: "DB ready" },
        });

        emitEvent(executionId, {
          type: "AGENT_MESSAGE",
          agent: "Worker-DB",
          result: "DB ready",
        });

        // Sentinel validation
        const ok = await runSentinel(executionId);

        await client.query(
          `UPDATE executions
             SET status = $2,
                 finished_at = NOW()
           WHERE id = $1`,
          [executionId, ok ? "completed" : "failed"]
        );

        emitEvent(executionId, {
          type: "EXECUTION_FINISHED",
          status: ok ? "completed" : "failed",
        });

        await client.query("COMMIT");
        console.log("✅ Execution finished", executionId);
      } catch (err) {
        await client.query("ROLLBACK");
        console.error("❌ Execution failed:", err.message, err.stack);
      } finally {
        client.release();
      }
    });

    console.log("📡 Worker subscribed to GOAL_SUBMITTED events");
  } catch (err) {
    console.error("❌ Worker startup failed:", err.message, err.stack);
    process.exit(1);
  }
})();

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("🛑 Worker shutting down...");
  await db.end();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("🛑 Worker terminated...");
  await db.end();
  process.exit(0);
});