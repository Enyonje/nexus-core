import OpenAI from "openai";
import { publishEvent } from "../events/publish.js";
import { db } from "../db/db.js";

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
  switch (goalType) {
    case "test":
      return runTestGoal(payload, executionId, stepCallback);
    case "http_request":
      return runHttpGoal(payload, executionId, stepCallback);
    case "analysis":
      return runAnalysisGoal(payload, executionId, stepCallback);
    case "automation":
      return runAutomationGoal(payload, executionId, stepCallback);

    /* =========================
       AI GOALS
    ========================= */
    case "ai_analysis":
      return runAiAnalysis(payload, executionId, stepCallback);
    case "ai_summary":
      return runAiSummary(payload, executionId, stepCallback);
    case "ai_plan":
      return runAiPlan(payload, executionId, stepCallback);

    default:
      throw new Error(`Unsupported goal type: ${goalType}`);
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
  cb?.({ name: "http_request", status: "completed" });
  return {
    request: { url: payload.url, method: payload.method || "GET" },
    response: "Simulated HTTP response",
  };
}

async function runAnalysisGoal(payload, executionId, cb) {
  if (!payload?.data) throw new Error("Missing analysis data");
  await recordStep(executionId, "analysis", "completed");
  cb?.({ name: "analysis", status: "completed" });
  return { result: "Analysis complete", size: JSON.stringify(payload.data).length };
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
async function streamWithEvents(stream, executionId, stepId, type, cb) {
  let text = "";
  let lastSent = 0;

  try {
    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta?.content;
      if (!delta) continue;
      text += delta;

      if (Date.now() - lastSent > 500) {
        await safePublish(executionId, stepId, text, "streaming");
        cb?.({ name: stepId, status: "streaming", partial: text });
        lastSent = Date.now();
      }
    }

    // Final flush
    await safePublish(executionId, stepId, text, "completed");
    cb?.({ name: stepId, status: "completed" });

    return { model: "openai:gpt-4o-mini", type, text };
  } catch (err) {
    await safePublish(executionId, stepId, err.message, "failed");
    cb?.({ name: stepId, status: "failed", error: err.message });
    throw err;
  }
}

/* =========================
   EVENT SAFETY
========================= */
async function safePublish(executionId, stepId, partial, status) {
  try {
    await publishEvent(
      db,
      { sub: "nexus-core", role: "service" },
      "execution_progress",
      { executionId, stepId, status, partial }
    );
  } catch (err) {
    console.warn("Event publish skipped:", err.message);
  }
}

/* =========================
   DB STEP RECORDING
========================= */
async function recordStep(executionId, name, status) {
  await db.query(
    `INSERT INTO execution_steps (execution_id, name, status, started_at, finished_at)
     VALUES ($1, $2, $3, NOW(), NOW())`,
    [executionId, name, status]
  );
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