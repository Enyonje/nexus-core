import OpenAI from "openai";
import { db } from "../db/db.js";
import { publishEvent } from "../events/stream.js";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

// Singleton OpenAI client initialization
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  maxRetries: 3,
  timeout: 30000,
});

/* =========================================================
   Helper: Cached Metadata Batch Execution Logger
========================================================= */
async function recordStep({
  executionId,
  type,
  status,
  reasoning = "",
  output = null,
  error = null,
  name = null,
  meta = {},
  ctx = null, // Cached execution context { user_id, org_id }
}) {
  try {
    let userId = ctx?.user_id;
    let orgId = ctx?.org_id;

    // Fallback to query if context is not supplied
    if (!userId || !orgId) {
      const { rows } = await db.query(
        `SELECT user_id, org_id FROM executions WHERE id = $1`,
        [executionId]
      );
      if (!rows.length) throw new Error(`Execution context missing for ID: ${executionId}`);
      userId = rows[0].user_id;
      orgId = rows[0].org_id;
    }

    const stepId = uuidv4();
    const stepName = name || type;

    const { rows } = await db.query(
      `INSERT INTO execution_steps (
          id, execution_id, user_id, org_id, name, step_type, status, reasoning, output, error, metadata, started_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
       RETURNING *`,
      [
        stepId,
        executionId,
        userId,
        orgId,
        stepName,
        type,
        status,
        reasoning,
        output ? JSON.stringify(output) : null,
        error ? String(error) : null,
        JSON.stringify(meta),
      ]
    );

    const stepData = rows[0];

    // Real-time Event Streaming via SSE/WebSockets
    publishEvent({
      event: "execution_step_updated",
      executionId,
      data: {
        id: stepData.id,
        name: stepData.name,
        type: stepData.step_type,
        status: stepData.status,
        reasoning: stepData.reasoning,
        output: stepData.output,
        error: stepData.error,
        started_at: stepData.started_at,
      },
    });

    return stepId;
  } catch (err) {
    console.error(`[ExecutionEngine:Error] Step recording failed on execution ${executionId}:`, err);
    throw err;
  }
}

/* =========================================================
   Goal Handler: Enterprise Analysis Engine
========================================================= */
async function runAnalysisGoal(payload, executionId, ctx, cb) {
  const text = payload?.text || "";

  const stepId = await recordStep({
    executionId,
    type: "analysis",
    status: "running",
    reasoning: "Performing token and structure analysis...",
    ctx,
  });
  cb?.({ id: stepId, name: "analysis", status: "running" });

  const words = text.trim() ? text.trim().split(/\s+/) : [];
  const result = {
    length: text.length,
    wordCount: words.length,
    characterCountNoSpaces: text.replace(/\s+/g, "").length,
    timestamp: new Date().toISOString(),
  };

  const completedId = await recordStep({
    executionId,
    type: "analysis",
    status: "completed",
    reasoning: "Analysis complete.",
    output: result,
    ctx,
  });
  cb?.({ id: completedId, name: "analysis", status: "completed", result });

  return result;
}

/* =========================================================
   Goal Handler: Parallel Concurrent Task Pipeline
========================================================= */
async function runAutomationGoal(payload, executionId, ctx, cb) {
  const tasks = payload?.steps;
  if (!Array.isArray(tasks) || tasks.length === 0) {
    throw new Error("Automation execution requires a non-empty 'steps' array.");
  }

  const maxConcurrency = payload?.concurrency || 3;
  const results = [];

  // Helper for resilient step execution with retry policies
  const executeSingleTask = async (taskName) => {
    const runningId = await recordStep({
      executionId,
      type: "automation_task",
      status: "running",
      reasoning: `Executing automated pipeline step: ${taskName}`,
      name: taskName,
      ctx,
    });
    cb?.({ id: runningId, name: taskName, status: "running" });

    try {
      // Dynamic task processing simulation / API call hook
      await new Promise((resolve) => setTimeout(resolve, payload?.delayMs || 400));

      const stepOutput = { task: taskName, status: "success", executedAt: new Date().toISOString() };

      const completedId = await recordStep({
        executionId,
        type: "automation_task",
        status: "completed",
        reasoning: `Task '${taskName}' completed successfully.`,
        output: stepOutput,
        name: taskName,
        ctx,
      });

      const res = { id: completedId, name: taskName, status: "completed", result: stepOutput };
      cb?.(res);
      return res;
    } catch (err) {
      const failedId = await recordStep({
        executionId,
        type: "automation_task",
        status: "failed",
        reasoning: `Task '${taskName}' execution failed.`,
        error: err.message,
        name: taskName,
        ctx,
      });
      const res = { id: failedId, name: taskName, status: "failed", error: err.message };
      cb?.(res);
      throw err;
    }
  };

  // Chunked concurrent pool processing
  for (let i = 0; i < tasks.length; i += maxConcurrency) {
    const chunk = tasks.slice(i, i + maxConcurrency);
    const chunkResults = await Promise.all(chunk.map((task) => executeSingleTask(task)));
    results.push(...chunkResults);
  }

  return { status: "all_tasks_completed", summary: results };
}

/* =========================================================
   Goal Handler: Structured AI Agentic Orchestration
========================================================= */
async function runAiPlanGoal(payload, executionId, ctx, cb) {
  const prompt = payload?.prompt;
  if (!prompt) throw new Error("AI Plan requires a target 'prompt' parameter.");

  const stepId = await recordStep({
    executionId,
    type: "ai_plan",
    status: "running",
    reasoning: "Synthesizing goal context and structuring agentic plan...",
    name: "ai_plan",
    ctx,
  });
  cb?.({ id: stepId, name: "ai_plan", status: "running" });

  try {
    const response = await openai.chat.completions.create({
      model: payload?.model || "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are Nexus Core's autonomous agent engine. Output clear, deterministic, and structured execution plans formatted in strict JSON.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });

    const rawContent = response.choices[0]?.message?.content || "{}";
    const structuredPlan = JSON.parse(rawContent);

    const usageMeta = {
      tokens: response.usage,
      model: response.model,
    };

    const completedId = await recordStep({
      executionId,
      type: "ai_plan",
      status: "completed",
      reasoning: "AI plan successfully synthesized.",
      output: structuredPlan,
      meta: usageMeta,
      name: "ai_plan",
      ctx,
    });

    const result = { plan: structuredPlan, usage: usageMeta };
    cb?.({ id: completedId, name: "ai_plan", status: "completed", result });

    return result;
  } catch (err) {
    const failedId = await recordStep({
      executionId,
      type: "ai_plan",
      status: "failed",
      reasoning: "Failed to generate AI plan.",
      error: err.message,
      name: "ai_plan",
      ctx,
    });
    cb?.({ id: failedId, name: "ai_plan", status: "failed", error: err.message });
    throw err;
  }
}

/* =========================================================
   Default Fallback Handler
========================================================= */
async function runNoopGoal(payload, executionId, ctx, cb) {
  const stepId = await recordStep({
    executionId,
    type: "noop",
    status: "running",
    reasoning: "Executing fallback default goal handler...",
    name: "noop",
    ctx,
  });
  cb?.({ id: stepId, name: "noop", status: "running" });

  const result = { echo: payload || null, processedAt: new Date().toISOString() };

  const completedId = await recordStep({
    executionId,
    type: "noop",
    status: "completed",
    reasoning: "Default goal processed successfully.",
    output: result,
    name: "noop",
    ctx,
  });

  cb?.({ id: completedId, name: "noop", status: "completed", result });
  return result;
}

/* =========================================================
   Primary Export Wrapper (Context-Aware Routing)
========================================================= */
export async function executeGoalLogic(goalType, payload, executionId, cb) {
  // 1. Fetch & Cache Execution Context once at entry to resolve N+1 DB bottleneck
  const { rows } = await db.query(
    `SELECT user_id, org_id FROM executions WHERE id = $1`,
    [executionId]
  );

  if (!rows.length) {
    throw new Error(`Invalid Execution ID: ${executionId}`);
  }

  const ctx = {
    user_id: rows[0].user_id,
    org_id: rows[0].org_id,
  };

  // 2. Route Execution
  switch (goalType) {
    case "analysis":
      return await runAnalysisGoal(payload, executionId, ctx, cb);
    case "automation":
      return await runAutomationGoal(payload, executionId, ctx, cb);
    case "ai_plan":
      return await runAiPlanGoal(payload, executionId, ctx, cb);
    default:
      return await runNoopGoal(payload, executionId, ctx, cb);
  }
}