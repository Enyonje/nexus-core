// src/execution/runner.js
import { db } from "../db/db.js";
import { executeGoalLogic } from "./logic.js";
import { withRetry } from "./retry.js";
import { publishEvent, publishAudit } from "../events/publish.js";
import { runSentinel, summarizeBlockedSteps } from "../agents/sentinel.js";

/* =========================================================
   Plugin Registry
========================================================= */
const stepPlugins = new Map();

export function registerStepPlugin(name, handler) {
  if (typeof handler !== "function") {
    throw new Error(`Plugin handler for '${name}' must be a function.`);
  }
  stepPlugins.set(name, handler);
}

/* =========================================================
   Payload Validation & Normalization
========================================================= */
function validatePayload(goalType, payload = {}) {
  const normalized = { ...payload };

  if (!normalized.parameters) {
    normalized.parameters = { threshold: 0.75, mode: "fast" };
  }

  switch (goalType) {
    case "processFile":
      if (!normalized.filePath) normalized.filePath = "uploads/default.txt";
      break;
    case "analysis":
    case "ai_generate":
      if (!normalized.text || typeof normalized.text !== "string" || !normalized.text.trim()) {
        normalized.text = "Default execution payload input";
      }
      break;
  }

  return normalized;
}

/* =========================================================
   Step Execution Dispatcher
========================================================= */
async function runStep(stepInfo) {
  // Check custom registered plugins first
  if (stepPlugins.has(stepInfo.name)) {
    return await stepPlugins.get(stepInfo.name)(stepInfo);
  }

  switch (stepInfo.name) {
    case "fetchData": {
      const url = stepInfo.payload?.url || "https://api.github.com/repos/vercel/vercel";
      const res = await fetch(url, { headers: { "User-Agent": "NexusCore-Runner/1.0" } });
      if (!res.ok) throw new Error(`Fetch failed with status ${res.status}`);
      return { data: await res.json() };
    }
    case "processFile":
      return { processed: true, file: stepInfo.filePath || "unknown" };
    case "ai_generate":
      return { text: stepInfo.payload?.prompt ? `Generated response for: ${stepInfo.payload.prompt}` : "AI Output" };
    case "analysis":
      return { text: stepInfo.payload?.text || "Analysis result" };
    case "ai_ml_inference": {
      const endpoint = process.env.ML_INFERENCE_ENDPOINT || "https://ml-service/api/infer";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.INTERNAL_SERVICE_KEY || ""}`,
        },
        body: JSON.stringify(stepInfo.payload || {}),
      });
      if (!res.ok) throw new Error(`ML inference upstream error: ${res.status}`);
      return await res.json();
    }
    default:
      return { echo: stepInfo.payload || null };
  }
}

/* =========================================================
   Audit & Event Logging
========================================================= */
async function auditLog(executionId, status, meta = {}) {
  try {
    await db.query(
      `INSERT INTO execution_audit (id, execution_id, status, meta, created_at)
       VALUES (gen_random_uuid(), $1, $2, $3, NOW())`,
      [executionId, status, JSON.stringify(meta)]
    );
    await publishAudit(executionId, status, meta);
  } catch (err) {
    console.error(`[Runner:AuditError] Failed to register audit log for ${executionId}:`, err);
  }
}

/* =========================================================
   Main Core Execution Orchestrator
========================================================= */
export async function runExecution(executionId, payloadOverride = null) {
  // 1. Fetch Execution Record and Permissions
  const { rows } = await db.query(
    `SELECT e.id, e.goal_id, e.user_id, e.org_id, e.status,
            g.goal_type, g.goal_payload,
            u.subscription, u.role
     FROM executions e
     JOIN goals g ON g.id = e.goal_id
     JOIN users u ON u.id = e.user_id
     WHERE e.id = $1`,
    [executionId]
  );

  if (!rows.length) {
    throw new Error(`Execution ${executionId} not found`);
  }

  const execution = rows[0];

  // RBAC & Subscription Guards
  if (execution.goal_type === "sensitive" && execution.role !== "admin") {
    throw new Error("Forbidden: Insufficient authorization for sensitive workflows.");
  }
  if (execution.subscription === "free") {
    throw new Error("Upgrade required: Pro or Enterprise plan needed to run executions.");
  }

  // 2. Prepare Payload
  let payload = payloadOverride ? { ...execution.goal_payload, ...payloadOverride } : execution.goal_payload;
  payload = validatePayload(execution.goal_type, payload);

  const start = Date.now();

  // Heartbeat keep-alive
  const heartbeat = setInterval(() => {
    publishEvent({ executionId, event: "execution_heartbeat", ts: Date.now() });
  }, 10000);

  let hasSentinelBlocked = false;

  try {
    // 3. Set Execution Running State
    await db.query(`UPDATE executions SET status = 'running', started_at = NOW() WHERE id = $1`, [executionId]);
    await db.query(`UPDATE users SET executions_count = executions_count + 1 WHERE id = $1`, [execution.user_id]);

    await publishEvent({ executionId, event: "execution_started", goalType: execution.goal_type });
    await auditLog(executionId, "started", { goalType: execution.goal_type });

    // 4. Delegate to Goal Engine Logic with Managed Retry Wrapper
    const result = await executeGoalLogic(
      execution.goal_type,
      payload,
      executionId,
      async (stepInfo) => {
        // Execute step via centralized withRetry wrapper
        const output = await withRetry(
          () => runStep(stepInfo),
          {
            retries: 3,
            backoffMs: 500,
            executionId,
            stepId: stepInfo.id,
          }
        );

        // Security Validation (Sentinel AI Agent Guard)
        const verdict = await runSentinel(executionId, stepInfo, output);
        if (!verdict.allowed) {
          hasSentinelBlocked = true;
          await publishEvent({ executionId, event: "sentinel_blocked", stepId: stepInfo.id, reason: verdict.reason });
          await auditLog(executionId, "step_blocked", { step: stepInfo.name, reason: verdict.reason });
          throw new Error(`Sentinel policy blocked step '${stepInfo.name}': ${verdict.reason}`);
        }

        // Increment Token Metering if output specified usage
        if (output?.tokensUsed) {
          await db.query(`UPDATE users SET ai_used = ai_used + $2 WHERE id = $1`, [execution.user_id, output.tokensUsed]);
        }
      }
    );

    // 5. Finalize Execution
    const duration = Date.now() - start;
    const finalStatus = hasSentinelBlocked ? "blocked" : "completed";

    await db.query(
      `UPDATE executions
       SET status = $2, finished_at = NOW(), result = $3, duration_ms = $4
       WHERE id = $1`,
      [executionId, finalStatus, JSON.stringify(result), duration]
    );

    await summarizeBlockedSteps(executionId);

    clearInterval(heartbeat);
    await publishEvent({ executionId, event: `execution_${finalStatus}`, result, duration });
    await auditLog(executionId, finalStatus, { duration });

    return result;
  } catch (err) {
    clearInterval(heartbeat);
    const duration = Date.now() - start;

    await db.query(
      `UPDATE executions
       SET status = 'failed', finished_at = NOW(), error = $2, duration_ms = $3
       WHERE id = $1`,
      [executionId, err.message, duration]
    );

    await publishEvent({
      executionId,
      event: "execution_failed",
      error: err.message,
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });

    await auditLog(executionId, "failed", { error: err.message });
    throw err;
  }
}