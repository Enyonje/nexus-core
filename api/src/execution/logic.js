import OpenAI from "openai";
import { db } from "../db/db.js";
import { publishEvent } from "../routes/executions.js";

/* =========================
   SAFE OPENAI CLIENT
========================= */
function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) return null;
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

/* =========================
   PLUGIN REGISTRY
========================= */
const customPlugins = new Map();
export function registerGoalPlugin(name, handler) {
  customPlugins.set(name, handler);
}

/* =========================
   RETRY HELPER
========================= */
async function withRetry(fn, args, retries = 3, delay = 1000) {
  let lastErr;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn(...args);
    } catch (err) {
      lastErr = err;
      if (isTransientError(err)) {
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

function isTransientError(err) {
  return /timeout|ECONNRESET|rate limit/i.test(err.message);
}

/* =========================
   AUDIT LOGGING
========================= */
async function auditLog(executionId, goalType, status, meta = {}) {
  try {
    await db.query(
      `INSERT INTO goal_audit (execution_id, goal_type, status, meta, timestamp)
       VALUES ($1, $2, $3, $4, NOW())`,
      [executionId, goalType, status, JSON.stringify(meta)]
    );
  } catch (err) {
    // Silent fail
  }
}

/* =========================
   ENTRY POINT
========================= */
export async function executeGoalLogic(goalType, payload, executionId, stepCallback) {
  try {
    // Plugin override
    if (customPlugins.has(goalType)) {
      const result = await withRetry(customPlugins.get(goalType), [payload, executionId, stepCallback]);
      await auditLog(executionId, goalType, "completed", { plugin: true });
      return result;
    }

    // Conditional branching example
    if (goalType === "analysis" && !payload?.text) {
      throw new Error("Analysis goal requires text");
    }

    let result;
    switch (goalType) {
      case "analysis":
        result = await withRetry(runAnalysisGoal, [payload, executionId, stepCallback]);
        break;
      case "test":
        result = await withRetry(runTestGoal, [payload, executionId, stepCallback]);
        break;
      case "http_request":
        result = await withRetry(runHttpGoal, [payload, executionId, stepCallback]);
        break;
      case "automation":
        result = await withRetry(runAutomationGoal, [payload, executionId, stepCallback]);
        break;
      case "ai_analysis":
        result = await withRetry(runAiAnalysis, [payload, executionId, stepCallback]);
        break;
      case "ai_summary":
        result = await withRetry(runAiSummary, [payload, executionId, stepCallback]);
        break;
      case "ai_plan":
        result = await withRetry(runAiPlan, [payload, executionId, stepCallback]);
        break;
      case "weather": // Example external API integration
        result = await withRetry(runWeatherGoal, [payload, executionId, stepCallback]);
        break;
      default:
        throw new Error(`Unsupported goal type: ${goalType}`);
    }

    await auditLog(executionId, goalType, "completed", { payload });
    return result;
  } catch (err) {
    await auditLog(executionId, goalType, "failed", { error: err.message });
    throw err;
  }
}

/* =========================
   STANDARD GOALS
========================= */
async function runTestGoal(payload, executionId, cb) {
  await recordStep(executionId, "test", "completed");
  cb?.({ name: "test", status: "completed" });
  return { ok: true, message: "Test goal executed", payload };
}

async function runHttpGoal(payload, executionId, cb) {
  if (!payload?.url) throw new Error("Missing URL");
  await recordStep(executionId, "http_request", "completed");
  cb?.({ name: "http_request", status: "completed", result: { url: payload.url } });
  return {
    request: { url: payload.url, method: payload.method || "GET" },
    response: "Simulated HTTP response",
  };
}

async function runAnalysisGoal(payload, executionId, cb) {
  const text = payload?.text || (payload?.data ? String(payload.data) : null);
  if (!text) throw new Error("Missing analysis data: text is required");

  await recordStep(executionId, "analysis", "completed");
  cb?.({ name: "analysis", status: "completed", result: { length: text.length } });

  return { result: "Analysis complete", length: text.length };
}

async function runAutomationGoal(payload, executionId, cb) {
  if (!Array.isArray(payload?.steps)) throw new Error("Automation requires steps[]");
  const results = [];
  for (let i = 0; i < payload.steps.length; i++) {
    const stepName = payload.steps[i];
    await recordStep(executionId, stepName, "completed");
    cb?.({ name: stepName, status: "completed" });
    results.push({ step: i + 1, name: stepName, status: "done" });
  }
  return { executed: results.length, steps: results };
}

/* =========================
   EXTERNAL API GOAL
========================= */
async function runWeatherGoal(payload, executionId, cb) {
  if (!payload?.city) throw new Error("Weather goal requires city");
  const res = await fetch(`https://api.weatherapi.com/v1/current.json?key=${process.env.WEATHER_KEY}&q=${payload.city}`);
  const data = await res.json();
  await recordStep(executionId, "weather", "completed", data);
  cb?.({ name: "weather", status: "completed", result: data });
  return data;
}

/* =========================
   AI GOALS (OpenAI Streaming)
========================= */
// (keep your existing runAiAnalysis, runAiSummary, runAiPlan, streamWithEvents, etc.)

/* =========================
   DB STEP RECORDING
========================= */
async function recordStep(executionId, name, status, output = null, error = null) {
  try {
    const { rows } = await db.query(
      `SELECT user_id, org_id FROM executions WHERE id = $1`,
      [executionId]
    );
    if (!rows.length) return;
    const { user_id, org_id } = rows[0];

    await db.query(
      `INSERT INTO execution_steps (
         execution_id, user_id, org_id, name, status, started_at, finished_at, output, error
       )
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW(), $6, $7)`,
      [
        executionId,
        user_id,
        org_id,
        name,
        status,
        output ? JSON.stringify(output) : null,
        error,
      ]
    );
  } catch (err) {
    // Silent fail
  }
}

/* =========================
   FALLBACK MODE
========================= */
function fallback(type, input) {
  return {
    model: "fallback",
    type,
    message: "AI unavailable – using safe fallback",
    preview: String(input).slice(0, 200),
  };
}


/* =========================
   Recommendations for Advanced Features
========================= */
// 1. Add goal retry logic for transient failures.
// 2. Support conditional goal branching and dependencies.
// 3. Allow custom user-defined goal plugins.
// 4. Integrate with external APIs/services for more goal types.
// 5. Add goal-level audit logging and analytics.
// 6. Support pausing/resuming long-running goals.
// 7. Add role-based access for sensitive goal types.
// 8. Implement goal timeout and cancellation.
// 9. Provide detailed error reporting and troubleshooting hints.
// 10. Enable goal output streaming to UI for real-time feedback.