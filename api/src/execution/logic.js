import OpenAI from "openai";
import { db } from "../db/db.js";
import { publishEvent } from "../routes/executions.js"; // in‑memory SSE bus

/* =========================
   SAFE OPENAI CLIENT
========================= */
function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) return null;
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

/* =========================
   ENTRY POINT
========================= */
export async function executeGoalLogic(goalType, payload, executionId, stepCallback) {
  try {
    if (goalType === "analysis") {
      const normalized = {
        text: payload?.text || (payload?.data ? String(payload.data) : null),
        parameters: payload?.parameters || { threshold: 0.75, mode: "fast" },
      };
      console.log(`[Execution ${executionId}] Starting analysis goal with payload:`, normalized);
      const result = await runAnalysisGoal(normalized, executionId, stepCallback);
      console.log(`[Execution ${executionId}] Goal "analysis" completed successfully`, { result });
      return result;
    }

    console.log(`[Execution ${executionId}] Starting goal type: ${goalType}`, payload);

    let result;
    switch (goalType) {
      case "test":
        result = await runTestGoal(payload, executionId, stepCallback);
        break;
      case "http_request":
        result = await runHttpGoal(payload, executionId, stepCallback);
        break;
      case "automation":
        result = await runAutomationGoal(payload, executionId, stepCallback);
        break;
      case "ai_analysis":
        result = await runAiAnalysis(payload, executionId, stepCallback);
        break;
      case "ai_summary":
        result = await runAiSummary(payload, executionId, stepCallback);
        break;
      case "ai_plan":
        result = await runAiPlan(payload, executionId, stepCallback);
        break;
      default:
        throw new Error(`Unsupported goal type: ${goalType}`);
    }

    console.log(`[Execution ${executionId}] Goal "${goalType}" completed successfully`, { result });
    return result;
  } catch (err) {
    console.error(`[Execution ${executionId}] Goal "${goalType}" failed: ${err.message}`, {
      payload,
      stack: err.stack,
    });
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
  const parameters = payload?.parameters || { threshold: 0.75, mode: "fast" };

  if (!text) throw new Error("Missing analysis data: text is required");

  await recordStep(executionId, "analysis", "completed");
  cb?.({
    name: "analysis",
    status: "completed",
    result: { length: text.length, parameters },
  });

  return { result: "Analysis complete", length: text.length, parameters };
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
   AI GOALS (OpenAI Streaming)
========================= */
async function runAiAnalysis(payload, executionId, cb) {
  if (!payload?.prompt) throw new Error("AI analysis requires prompt");
  const client = getOpenAIClient();
  if (!client) return fallback("analysis", payload.prompt);

  const stream = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You are an expert analyst." },
      { role: "user", content: payload.prompt },
    ],
    stream: true,
  });

  return streamWithEvents(stream, executionId, "ai_analysis", "analysis", cb);
}

async function runAiSummary(payload, executionId, cb) {
  if (!payload?.text) throw new Error("AI summary requires text");
  const client = getOpenAIClient();
  if (!client) return fallback("summary", payload.text);

  const stream = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "Summarize the following text clearly and concisely." },
      { role: "user", content: payload.text },
    ],
    stream: true,
  });

  return streamWithEvents(stream, executionId, "ai_summary", "summary", cb);
}

async function runAiPlan(payload, executionId, cb) {
  if (!payload?.objective) throw new Error("AI plan requires objective");
  const client = getOpenAIClient();
  if (!client) return fallback("plan", payload.objective);

  const stream = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "Create a step-by-step actionable plan." },
      { role: "user", content: payload.objective },
    ],
    stream: true,
  });

  const result = await streamWithEvents(stream, executionId, "ai_plan", "plan", cb);
  return {
    ...result,
    plan: result.text.split(/\r?\n/).map((s) => s.trim()).filter(Boolean),
  };
}

/* =========================
   STREAM HANDLER
========================= */
async function streamWithEvents(stream, executionId, stepName, type, cb) {
  let text = "";
  let lastSent = 0;

  try {
    await recordStep(executionId, stepName, "running");
    console.log(`[Execution ${executionId}] Step "${stepName}" started`);

    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta?.content;
      if (!delta) continue;
      text += delta;

      if (Date.now() - lastSent > 500) {
        console.log(`[Execution ${executionId}] Step "${stepName}" streaming progress`, {
          partialLength: text.length,
        });
        publishEvent(executionId, {
          event: "execution_step_progress",
          step: stepName,
          status: "streaming",
          partial: text,
        });
        cb?.({ name: stepName, status: "streaming", partial: text });
        lastSent = Date.now();
      }
    }

    await db.query(
      `UPDATE execution_steps
       SET status = 'completed', finished_at = NOW(), output = $2
       WHERE execution_id = $1 AND name = $3`,
      [executionId, JSON.stringify({ model: "openai:gpt-4o-mini", type, text }), stepName]
    );

    console.log(`[Execution ${executionId}] Step "${stepName}" completed successfully`, {
      length: text.length,
    });

    publishEvent(executionId, {
      event: "execution_step_completed",
      step: stepName,
      result: text,
    });
    cb?.({ name: stepName, status: "completed", result: text });

    return { model: "openai:gpt-4o-mini", type, text };
  } catch (err) {
    await db.query(
      `UPDATE execution_steps
       SET status = 'failed', finished_at = NOW(), error = $2
       WHERE execution_id = $1 AND name = $3`,
      [executionId, err.message, stepName]
    );

    console.error(`[Execution ${executionId}] Step "${stepName}" failed: ${err.message}`, {
      stack: err.stack,
    });

    publishEvent(executionId, {
      event: "execution_step_failed",
      step: stepName,
      error: err.message,
    });
    cb?.({ name: stepName, status: "failed", error: err.message });
    throw err;
  }
}

/* =========================
   EVENT SAFETY
========================= */
async function safePublish(executionId, stepId, partial, status) {
  try {
    publishEvent(executionId, {
      event: "execution_progress",
      step: stepId,
      status,
      result: partial,
    });
    console.log(`[Execution ${executionId}] Event published`, {
      step: stepId,
      status,
      preview: String(partial).slice(0, 100),
    });
  } catch (err) {
    console.warn(`[Execution ${executionId}] Event publish skipped: ${err.message}`);
  }
}

/* =========================
   DB STEP RECORDING
========================= */
async function recordStep(executionId, name, status, output = null, error = null) {
  try {
    const { rows } = await db.query(
      `SELECT user_id, org_id FROM executions WHERE id = $1`,
      [executionId]
    );
    if (!rows.length) {
      console.warn(`[Execution ${executionId}] recordStep skipped: no parent execution found`);
      return;
    }
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

    console.log(`[Execution ${executionId}] Step record inserted`, {
      name,
      status,
      hasOutput: !!output,
      hasError: !!error,
    });
  } catch (err) {
    console.error(`[Execution ${executionId}] Failed to record step "${name}": ${err.message}`, {
      status,
      output,
      error,
      stack: err.stack,
    });
  }
}

/* =========================
   FALLBACK MODE
========================= */
function fallback(type, input) {
  console.warn(`Fallback triggered for type "${type}"`);
  return {
    model: "fallback",
    type,
    message: "AI unavailable – using safe fallback",
    preview: String(input).slice(0, 200),
  };
}