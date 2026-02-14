// src/execution/stepExecutor.js
import { publishEvent } from "../routes/executions.js"; // use same SSE bus
import { db } from "../db/db.js";
import fetch from "node-fetch"; // for http_request steps
import OpenAI from "openai";

const SYSTEM_IDENTITY = {
  sub: "nexus-core",
  role: "service",
};

function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) return null;
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export async function executeStep(executionId, step) {
  try {
    // Mark step as started in DB
    await db.query(
      `UPDATE execution_steps 
       SET status = 'running', started_at = NOW() 
       WHERE id = $1`,
      [step.id]
    );

    publishEvent(executionId, {
      event: "execution_step_started",
      stepId: step.id,
      stepType: step.step_type,
    });

    // Run the step based on type
    const result = await runStep(step);

    // Mark step as completed
    await db.query(
      `UPDATE execution_steps 
       SET status = 'completed', finished_at = NOW(), output = $2 
       WHERE id = $1`,
      [step.id, JSON.stringify(result)]
    );

    publishEvent(executionId, {
      event: "execution_step_completed",
      stepId: step.id,
      output: result,
    });

    return result;
  } catch (err) {
    // Mark step as failed
    await db.query(
      `UPDATE execution_steps 
       SET status = 'failed', finished_at = NOW(), error = $2 
       WHERE id = $1`,
      [step.id, err.message]
    );

    publishEvent(executionId, {
      event: "execution_step_failed",
      stepId: step.id,
      error: err.message,
    });

    throw err;
  }
}

/* =========================
   STEP LOGIC HANDLERS
========================= */
async function runStep(step) {
  switch (step.step_type) {
    case "http_request":
      return runHttpStep(step);
    case "ai_analysis":
      return runAiStep(step, "You are an expert analyst.");
    case "ai_summary":
      return runAiStep(step, "Summarize the following text clearly.");
    case "automation":
      return runAutomationStep(step);
    default:
      return { success: true, data: `Ran step ${step.step_type}` };
  }
}

async function runHttpStep(step) {
  const { url, method = "GET", headers = {}, body } = step.payload || {};
  if (!url) throw new Error("Missing URL in http_request step");

  const res = await fetch(url, { method, headers, body });
  const text = await res.text();
  return { status: res.status, body: text };
}

async function runAiStep(step, systemPrompt) {
  const client = getOpenAIClient();
  if (!client) return { model: "fallback", message: "AI unavailable" };

  const stream = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: step.payload?.prompt || step.payload?.text },
    ],
    stream: true,
  });

  let text = "";
  for await (const chunk of stream) {
    const delta = chunk.choices?.[0]?.delta?.content;
    if (!delta) continue;
    text += delta;

    // Publish streaming progress
    publishEvent(step.execution_id, {
      event: "execution_step_progress",
      stepId: step.id,
      partial: text,
    });
  }

  return { model: "openai:gpt-4o-mini", text };
}

async function runAutomationStep(step) {
  if (!Array.isArray(step.payload?.tasks)) {
    throw new Error("Automation step requires tasks[]");
  }
  return step.payload.tasks.map((t, i) => ({
    step: i + 1,
    name: t,
    status: "done",
  }));
}