import { publishEvent } from "../routes/executions.js";
import { db } from "../db/db.js";
import fetch from "node-fetch";
import OpenAI from "openai";

const SYSTEM_IDENTITY = {
  sub: "nexus-core",
  role: "service",
};

function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) return null;
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

/* ===============================
   Plugin Registry for custom steps
=============================== */
const stepPlugins = new Map();
export function registerStepPlugin(name, handler) {
  stepPlugins.set(name, handler);
}

/* ===============================
   Retry Helper for steps
=============================== */
async function withRetry(fn, args, retries = 3, delay = 2000) {
  let lastErr;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn(...args);
    } catch (err) {
      lastErr = err;
      if (/timeout|ECONNRESET|rate limit/i.test(err.message)) {
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

/* ===============================
   Execute Step
=============================== */
export async function executeStep(executionId, step) {
  try {
    // Mark step as started
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

    // Run with retry + timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), step.timeout_ms || 60000);

    const result = await withRetry(runStep, [step, controller]);

    clearTimeout(timeout);

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

    // Audit logging
    await db.query(
      `INSERT INTO step_audit (id, execution_id, step_id, status, meta, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [uuidv4(), executionId, step.id, "completed", JSON.stringify(result)]
    );

    return result;
  } catch (err) {
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
      hint: "Check payload format, network connectivity, or plugin configuration",
      stack: err.stack,
    });

    throw err;
  }
}

/* =========================
   STEP LOGIC HANDLERS
========================= */
async function runStep(step, controller) {
  // RBAC check for sensitive step types
  if (step.step_type === "sensitive" && step.role_required && step.role_required !== SYSTEM_IDENTITY.role) {
    throw new Error(`Role ${step.role_required} required for step ${step.id}`);
  }

  // Conditional branching
  if (step.condition && !evaluateCondition(step.condition)) {
    return { skipped: true, reason: "Condition not met" };
  }

  // Dependencies
  if (step.depends_on && !(await checkDependency(step.depends_on))) {
    return { skipped: true, reason: "Dependency not satisfied" };
  }

  // Plugin support
  if (stepPlugins.has(step.step_type)) {
    return stepPlugins.get(step.step_type)(step);
  }

  switch (step.step_type) {
    case "http_request":
      return runHttpStep(step, controller);
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

async function runHttpStep(step, controller) {
  const { url, method = "GET", headers = {}, body } = step.payload || {};
  if (!url) throw new Error("Missing URL in http_request step");

  const res = await fetch(url, { method, headers, body, signal: controller.signal });
  const reader = res.body.getReader();
  let text = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = new TextDecoder().decode(value);
    text += chunk;

    publishEvent(step.execution_id, {
      event: "execution_step_progress",
      stepId: step.id,
      partial: text,
    });
  }

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
  const results = [];
  for (let i = 0; i < step.payload.tasks.length; i++) {
    const result = { step: i + 1, name: step.payload.tasks[i], status: "done" };
    results.push(result);

    publishEvent(step.execution_id, {
      event: "execution_step_progress",
      stepId: step.id,
      partial: results,
    });
  }
  return results;
}

/* =========================
   Helpers
========================= */
function evaluateCondition(condition) {
  // Simple evaluator stub
  return condition === true;
}

async function checkDependency(depId) {
  const { rows } = await db.query(
    `SELECT status FROM execution_steps WHERE id=$1`,
    [depId]
  );
  return rows.length && rows[0].status === "completed";
}
}

/* =========================
   Recommendations for Advanced Features
========================= */
// 1. Add step retry logic for transient errors.
// 2. Support conditional branching and step dependencies.
// 3. Allow custom user-defined step plugins.
// 4. Integrate with external APIs/services for more step types.
// 5. Add step-level audit logging and analytics.
// 6. Support pausing/resuming long-running steps.
// 7. Add role-based access for sensitive step types.
// 8. Implement step timeout and cancellation.
// 9. Provide detailed error reporting and troubleshooting hints.
// 10. Enable step output streaming to UI for real-time feedback.