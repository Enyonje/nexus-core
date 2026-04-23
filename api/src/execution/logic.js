// logic.js
import OpenAI from "openai";
import { db } from "../db/db.js";
import { publishEvent } from "../events/stream.js"; // Point this to your SSE broadcaster

/* =========================
   Helper: Record Step
========================= */
async function recordStep(executionId, type, status, reasoning = "", output = null, error = null) {
  try {
    const { rows } = await db.query(
      `SELECT user_id FROM executions WHERE id = $1`,
      [executionId]
    );
    if (!rows.length) return;
    const { user_id } = rows[0];

    // 1. Persist to DB
    const result = await db.query(
      `INSERT INTO execution_steps (
          execution_id, user_id, step_type, status, reasoning, output, error, created_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) RETURNING *`,
      [
        executionId,
        user_id,
        type,
        status,
        reasoning,
        output ? JSON.stringify(output) : null,
        error,
      ]
    );

    // 2. Broadcast to frontend
    publishEvent({
      event: "execution_updated",
      executionId: executionId,
      data: {
        id: result.rows[0].id,
        action: reasoning || `Executing ${type}`,
        details: output,
        status: status,
        created_at: new Date()
      }
    });

  } catch (err) {
    console.error("Failed to record step:", err);
  }
}

/* =========================
   Goal Handlers
========================= */
async function runAnalysisGoal(payload, executionId, cb) {
  const text = payload?.text || "No data provided";
  
  await recordStep(executionId, "analysis", "running", "Analyzing provided text density and structure...");

  const result = { length: text.length, wordCount: text.split(" ").length };

  await recordStep(executionId, "analysis", "completed", "Analysis complete. Metrics extracted.", result);
  
  cb?.({ name: "analysis", status: "completed", result });
  return result;
}

async function runAutomationGoal(payload, executionId, cb) {
  if (!Array.isArray(payload?.steps)) throw new Error("Automation requires steps[]");
  
  for (const stepName of payload.steps) {
    await recordStep(executionId, "automation_taskGot it — let’s extend your `logic.js` to handle the new `ai_plan` goal type. I’ll add a dedicated handler that uses OpenAI to generate a plan, records steps in the DB, and broadcasts updates to the frontend. Here’s the complete updated file:

```js
// logic.js
import OpenAI from "openai";
import { db } from "../db/db.js";
import { publishEvent } from "../events/stream.js"; // Point this to your SSE broadcaster

/* =========================
   Helper: Record Step
========================= */
async function recordStep(executionId, type, status, reasoning = "", output = null, error = null) {
  try {
    const { rows } = await db.query(
      `SELECT user_id FROM executions WHERE id = $1`,
      [executionId]
    );
    if (!rows.length) return;
    const { user_id } = rows[0];

    // 1. Persist to DB
    const result = await db.query(
      `INSERT INTO execution_steps (
          execution_id, user_id, step_type, status, reasoning, output, error, created_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) RETURNING *`,
      [
        executionId,
        user_id,
        type,
        status,
        reasoning,
        output ? JSON.stringify(output) : null,
        error,
      ]
    );

    // 2. Broadcast to frontend
    publishEvent({
      event: "execution_updated",
      executionId: executionId,
      data: {
        id: result.rows[0].id,
        action: reasoning || `Executing ${type}`,
        details: output,
        status: status,
        created_at: new Date()
      }
    });

  } catch (err) {
    console.error("Failed to record step:", err);
  }
}

/* =========================
   Goal Handlers
========================= */
async function runAnalysisGoal(payload, executionId, cb) {
  const text = payload?.text || "No data provided";
  
  await recordStep(executionId, "analysis", "running", "Analyzing provided text density and structure...");

  const result = { length: text.length, wordCount: text.split(" ").length };

  await recordStep(executionId, "analysis", "completed", "Analysis complete. Metrics extracted.", result);
  
  cb?.({ name: "analysis", status: "completed", result });
  return result;
}

async function runAutomationGoal(payload, executionId, cb) {
  if (!Array.isArray(payload?.steps)) throw new Error("Automation requires steps[]");
  
  for (const stepName of payload.steps) {
    await recordStep(executionId, "automation_task", "running", `Initiating swarm task: ${stepName}`);
    await new Promise(r => setTimeout(r, 800)); 
    await recordStep(executionId, "automation_task", "completed", `Successfully finished: ${stepName}`, { task: stepName, status: "success" });
  }
  
  return { status: "all_tasks_dispatched" };
}

/* =========================
   New Goal Handler: ai_plan
========================= */
async function runAiPlanGoal(payload, executionId, cb) {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const prompt = payload?.prompt || "Create a structured plan for the given goal.";

  await recordStep(executionId, "ai_plan", "running", "Generating AI-driven plan...");

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a planning assistant. Generate clear, step-by-step plans." },
        { role: "user", content: prompt }
      ],
      max_tokens: 300
    });

    const planText = response.choices[0].message.content;
    const result = { plan: planText };

    await recordStep(executionId, "ai_plan", "completed", "AI plan generated successfully.", result);
    cb?.({ name: "ai_plan", status: "completed", result });
    return result;
  } catch (err) {
    await recordStep(executionId, "ai_plan", "failed", "Failed to generate AI plan.", null, err.message);
    throw err;
  }
}

/* =========================
   Wrapper Export
========================= */
export async function executeGoalLogic(goalType, payload, executionId, cb) {
  switch (goalType) {
    case "analysis":
      return await runAnalysisGoal(payload, executionId, cb);
    case "automation":
      return await runAutomationGoal(payload, executionId, cb);
    case "ai_plan":
      return await runAiPlanGoal(payload, executionId, cb);
    // Add other cases for runHttpGoal, runWeatherGoal, etc.
    default:
      throw new Error(`Unknown goal type: ${goalType}`);
  }
}
