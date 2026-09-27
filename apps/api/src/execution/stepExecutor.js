// src/execution/steps.js
import { v4 as uuidv4 } from "uuid";
import OpenAI from "openai";
import { db } from "../db/db.js";
import { publishEvent } from "../routes/executions.js";
import { withRetry } from "./retry.js";

const SYSTEM_IDENTITY = {
  sub: "nexus-core",
  role: "service",
};

// Singleton OpenAI client initialization
let openaiClientInstance = null;
function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) return null;
  if (!openaiClientInstance) {
    openaiClientInstance = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      maxRetries: 2,
      timeout: 30000,
    });
  }
  return openaiClientInstance;
}

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
   Core Step Executor
========================================================= */
export async function executeStep(executionId, step) {
  const stepId = step.id;

  try {
    // 1. Mark step as running in Postgres
    await db.query(
      `UPDATE execution_steps 
       SET status = 'running', started_at = NOW() 
       WHERE id = $1`,
      [stepId]
    );

    safePublishEvent(executionId, {
      event: "execution_step_started",
      stepId,
      stepType: step.step_type,
    });

    // 2. Delegate to centralized withRetry wrapper
    const result = await withRetry(
      () => runStepWithTimeout(step),
      {
        retries: step.max_retries || 3,
        backoffMs: 500,
        timeoutMs: step.timeout_ms || 60000,
        executionId,
        stepId,
      }
    );

    // 3. Mark step completed
    await db.query(
      `UPDATE execution_steps 
       SET status = 'completed', finished_at = NOW(), output = $2 
       WHERE id = $1`,
      [stepId, JSON.stringify(result)]
    );

    safePublishEvent(executionId, {
      event: "execution_step_completed",
      stepId,
      output: result,
    });

    // 4. Audit Logging
    await db.query(
      `INSERT INTO step_audit (id, execution_id, step_id, status, meta, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [uuidv4(), executionId, stepId, "completed", JSON.stringify(result)]
    );

    return result;
  } catch (err) {
    await db.query(
      `UPDATE execution_steps 
       SET status = 'failed', finished_at = NOW(), error = $2 
       WHERE id = $1`,
      [stepId, err.message]
    );

    safePublishEvent(executionId, {
      event: "execution_step_failed",
      stepId,
      error: err.message,
      hint: "Check step payload format, permissions, or system connectivity.",
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });

    throw err;
  }
}

/* =========================================================
   Step Execution Routing & Timeout Management
========================================================= */
async function runStepWithTimeout(step) {
  const controller = new AbortController();
  const timeoutMs = step.timeout_ms || 60000;
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await runStep(step, controller);
  } finally {
    clearTimeout(timer);
  }
}

async function runStep(step, controller) {
  // Guard 1: Role-Based Access Control (RBAC)
  if (
    step.step_type === "sensitive" &&
    step.role_required &&
    step.role_required !== SYSTEM_IDENTITY.role
  ) {
    throw new Error(`Forbidden: Role '${step.role_required}' required for step '${step.id}'`);
  }

  // Guard 2: Conditional Branching Evaluation
  if (step.condition && !evaluateCondition(step.condition)) {
    return { skipped: true, reason: "Condition evaluated to false" };
  }

  // Guard 3: Dependency Resolution
  if (step.depends_on && !(await checkDependency(step.depends_on))) {
    return { skipped: true, reason: `Dependency '${step.depends_on}' was not satisfied` };
  }

  // Check Step Plugin Registry
  if (stepPlugins.has(step.step_type)) {
    return await stepPlugins.get(step.step_type)(step, controller);
  }

  // Built-in Handlers
  switch (step.step_type) {
    case "http_request":
      return await runHttpStep(step, controller);
    case "ai_analysis":
      return await runAiStep(step, "You are an expert analyst.", controller);
    case "ai_summary":
      return await runAiStep(step, "Summarize the provided text clearly and concisely.", controller);
    case "automation":
      return await runAutomationStep(step);
    default:
      return { success: true, data: `Executed fallback logic for step type '${step.step_type}'` };
  }
}

/* =========================================================
   Individual Step Logic Handlers
========================================================= */
async function runHttpStep(step, controller) {
  const { url, method = "GET", headers = {}, body } = step.payload || {};
  if (!url) throw new Error("Missing mandatory 'url' parameter in http_request step payload");

  // Use global Node.js fetch (supported in Node 18+)
  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal: controller.signal,
  });

  if (!response.ok) {
    throw new Error(`HTTP request failed with status code ${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const data = await response.json();
    return { status: response.status, data };
  }

  const text = await response.text();
  return { status: response.status, body: text };
}

async function runAiStep(step, systemPrompt, controller) {
  const client = getOpenAIClient();
  if (!client) {
    return { model: "fallback", message: "OPENAI_API_KEY environment variable is not configured." };
  }

  const promptInput = step.payload?.prompt || step.payload?.text;
  if (!promptInput) {
    throw new Error("AI step requires a 'prompt' or 'text' payload field.");
  }

  const stream = await client.chat.completions.create(
    {
      model: step.payload?.model || "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: promptInput },
      ],
      stream: true,
    },
    { signal: controller.signal }
  );

  let fullText = "";
  for await (const chunk of stream) {
    const delta = chunk.choices?.[0]?.delta?.content;
    if (!delta) continue;
    fullText += delta;

    safePublishEvent(step.execution_id, {
      event: "execution_step_progress",
      stepId: step.id,
      partial: fullText,
    });
  }

  return { model: step.payload?.model || "gpt-4o-mini", text: fullText };
}

async function runAutomationStep(step) {
  const tasks = step.payload?.tasks;
  if (!Array.isArray(tasks) || tasks.length === 0) {
    throw new Error("Automation step requires a non-empty 'tasks' array.");
  }

  const results = [];
  for (let i = 0; i < tasks.length; i++) {
    const result = { index: i + 1, task: tasks[i], status: "completed", timestamp: new Date().toISOString() };
    results.push(result);

    safePublishEvent(step.execution_id, {
      event: "execution_step_progress",
      stepId: step.id,
      partial: results,
    });
  }

  return { totalTasks: tasks.length, tasks: results };
}

/* =========================================================
   Helpers
========================================================= */
function evaluateCondition(condition) {
  if (typeof condition === "boolean") return condition;
  if (typeof condition === "object" && condition !== null) {
    if (condition.field && condition.equals !== undefined) {
      return condition.field === condition.equals;
    }
  }
  return Boolean(condition);
}

async function checkDependency(depId) {
  const { rows } = await db.query(
    `SELECT status FROM execution_steps WHERE id = $1`,
    [depId]
  );
  return rows.length > 0 && rows[0].status === "completed";
}

function safePublishEvent(executionId, payload) {
  try {
    publishEvent(executionId, payload);
  } catch (err) {
    console.error(`[StepsEngine:PublishError] Failed to stream step event for ${executionId}:`, err);
  }
}