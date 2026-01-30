/**
 * Central goal execution logic
 * AI-safe, crash-proof, extensible
 */

import OpenAI from "openai";
import { publishEvent } from "../events/publish.js";
import { db } from "../db/db.js";

/* =========================
   SAFE OPENAI CLIENT
========================= */

function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) return null;

  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

/* =========================
   ENTRY POINT
========================= */

export async function executeGoalLogic(goalType, payload, executionId) {
  switch (goalType) {
    case "test":
      return runTestGoal(payload);

    case "http_request":
      return runHttpGoal(payload);

    case "analysis":
      return runAnalysisGoal(payload);

    case "automation":
      return runAutomationGoal(payload);

    /* =========================
       AI GOALS
    ========================= */
    case "ai_analysis":
      return runAiAnalysis(payload, executionId);

    case "ai_summary":
      return runAiSummary(payload, executionId);

    case "ai_plan":
      return runAiPlan(payload, executionId);

    default:
      throw new Error(`Unsupported goal type: ${goalType}`);
  }
}

/* =========================
   STANDARD GOALS
========================= */

async function runTestGoal(payload) {
  return { ok: true, message: "Test goal executed", payload };
}

async function runHttpGoal(payload) {
  if (!payload?.url) throw new Error("Missing URL");

  return {
    simulated: true,
    request: {
      url: payload.url,
      method: payload.method || "GET",
    },
    response: "Simulated HTTP response",
  };
}

async function runAnalysisGoal(payload) {
  if (!payload?.data) throw new Error("Missing analysis data");

  return {
    result: "Analysis complete",
    size: JSON.stringify(payload.data).length,
  };
}

async function runAutomationGoal(payload) {
  if (!Array.isArray(payload?.steps)) {
    throw new Error("Automation requires steps[]");
  }

  return {
    executed: payload.steps.length,
    steps: payload.steps.map((s, i) => ({
      step: i + 1,
      name: s,
      status: "done",
    })),
  };
}

/* =========================
   AI GOALS (SAFE + STREAMING)
========================= */

async function runAiAnalysis(payload, executionId) {
  if (!payload?.prompt) throw new Error("AI analysis requires prompt");

  const client = getOpenAIClient();
  if (!client) {
    return fallback("analysis", payload.prompt);
  }

  const stream = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You are an expert analyst." },
      { role: "user", content: payload.prompt },
    ],
    stream: true,
  });

  return streamWithEvents(stream, executionId, "ai_analysis", "analysis");
}

async function runAiSummary(payload, executionId) {
  if (!payload?.text) throw new Error("AI summary requires text");

  const client = getOpenAIClient();
  if (!client) {
    return fallback("summary", payload.text);
  }

  const stream = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "Summarize the following text clearly and concisely.",
      },
      { role: "user", content: payload.text },
    ],
    stream: true,
  });

  return streamWithEvents(stream, executionId, "ai_summary", "summary");
}

async function runAiPlan(payload, executionId) {
  if (!payload?.objective) throw new Error("AI plan requires objective");

  const client = getOpenAIClient();
  if (!client) {
    return fallback("plan", payload.objective);
  }

  const stream = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "Create a step-by-step actionable plan.",
      },
      { role: "user", content: payload.objective },
    ],
    stream: true,
  });

  const result = await streamWithEvents(
    stream,
    executionId,
    "ai_plan",
    "plan"
  );

  return {
    ...result,
    plan: result.text.split("\n").filter(Boolean),
  };
}

/* =========================
   STREAM HANDLER (SAFE)
========================= */

async function streamWithEvents(stream, executionId, stepId, type) {
  let text = "";
  let lastSent = 0;

  for await (const chunk of stream) {
    const delta = chunk.choices?.[0]?.delta?.content;
    if (!delta) continue;

    text += delta;

    if (Date.now() - lastSent > 500) {
      await safePublish(executionId, stepId, text);
      lastSent = Date.now();
    }
  }

  return {
    model: "openai:gpt-4o-mini",
    type,
    text,
  };
}

/* =========================
   EVENT SAFETY
========================= */

async function safePublish(executionId, stepId, partial) {
  try {
    await publishEvent(
      "execution.progress",
      {
        executionId,
        stepId,
        status: "streaming",
        partial,
      }
    );
  } catch (err) {
    // NEVER crash execution due to events
    console.warn("Event publish skipped:", err.message);
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
