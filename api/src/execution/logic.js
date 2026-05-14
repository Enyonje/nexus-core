// src/execution/logic.js
import OpenAI from "openai";
import { db } from "../db/db.js";
import { publishEvent } from "../events/stream.js";
import { v4 as uuidv4 } from "uuid";

/* =========================
   Helper: Record Step
========================= */
async function recordStep(
  executionId,
  type,
  status,
  reasoning = "",
  output = null,
  error = null,
  name = null
) {
  try {
    const { rows } = await db.query(
      `SELECT user_id, org_id FROM executions WHERE id = $1`,
      [executionId]
    );
    if (!rows.length) return;
    const { user_id, org_id } = rows[0];

    const stepId = uuidv4();

    const result = await db.query(
      `INSERT INTO execution_steps (
          id, execution_id, user_id, org_id, name, step_type, status, reasoning, output, error, started_at
       )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())
       RETURNING *`,
      [
        stepId,
        executionId,
        user_id,
        org_id,
        name || type, // ✅ ensure name is never null
        type,
        status,
        reasoning,
        output ? JSON.stringify(output) : null,
        error,
      ]
    );

    publishEvent({
      event: "execution_updated",
      executionId,
      data: {
        id: result.rows[0].id,
        action: reasoning || `Executing ${type}`,
        details: output,
        status,
        started_at: new Date()
      }
    });

    return stepId;
  } catch (err) {
    console.error("Failed to record step:", err);
  }
}

/* =========================
   Goal Handlers
========================= */
async function runAnalysisGoal(payload, executionId, cb) {
  const text = payload?.text || "No data provided";
  await recordStep(executionId, "analysis", "running", "Analyzing provided text...", null, null, "analysis");
  const result = { length: text.length, wordCount: text.split(" ").length };
  await recordStep(executionId, "analysis", "completed", "Analysis complete.", result, null, "analysis");
  cb?.({ name: "analysis", status: "completed", result });
  return result;
}

async function runAutomationGoal(payload, executionId, cb) {
  if (!Array.isArray(payload?.steps)) throw new Error("Automation requires steps[]");
  for (const stepName of payload.steps) {
    await recordStep(executionId, "automation_task", "running", `Initiating task: ${stepName}`, null, null, stepName);
    await new Promise(r => setTimeout(r, 800));
    await recordStep(executionId, "automation_task", "completed", `Finished: ${stepName}`, { task: stepName, status: "success" }, null, stepName);
  }
  return { status: "all_tasks_dispatched" };
}

async function runAiPlanGoal(payload, executionId, cb) {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const prompt = payload?.prompt || "Create a structured plan for the given goal.";
  await recordStep(executionId, "ai_plan", "running", "Generating AI-driven plan...", null, null, "ai_plan");
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
    await recordStep(executionId, "ai_plan", "completed", "AI plan generated.", result, null, "ai_plan");
    cb?.({ name: "ai_plan", status: "completed", result });
    return result;
  } catch (err) {
    await recordStep(executionId, "ai_plan", "failed", "Failed to generate AI plan.", null, err.message, "ai_plan");
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
    default:
      throw new Error(`Unknown goal type: ${goalType}`);
  }
}
