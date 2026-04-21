import OpenAI from "openai";
import { db } from "../db/db.js";
import { publishEvent } from "../events/stream.js"; // Point this to your SSE broadcaster

/* ... keep OpenAI client and retry helpers ... */

async function recordStep(executionId, type, status, reasoning = "", output = null, error = null) {
  try {
    const { rows } = await db.query(
      `SELECT user_id FROM executions WHERE id = $1`,
      [executionId]
    );
    if (!rows.length) return;
    const { user_id } = rows[0];

    // 1. Persist to DB for AuditPage.jsx
    const result = await db.query(
      `INSERT INTO execution_steps (
          execution_id, user_id, step_type, status, reasoning, output, error, created_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) RETURNING *`,
      [
        executionId,
        user_id,
        type,      // Matches audit.js query
        status,
        reasoning, // Matches audit.js query
        output ? JSON.stringify(output) : null,
        error,
      ]
    );

    // 2. Broadcast to StreamPage.jsx (REAL-TIME)
    // This is the "Pulse" the frontend is waiting for
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
   UPDATED GOAL HANDLERS
========================= */

async function runAnalysisGoal(payload, executionId, cb) {
  const text = payload?.text || "No data provided";
  
  // Start the step
  await recordStep(executionId, "analysis", "running", "Analyzing provided text density and structure...");

  const result = { length: text.length, wordCount: text.split(' ').length };

  // Complete the step
  await recordStep(executionId, "analysis", "completed", "Analysis complete. Metrics extracted.", result);
  
  cb?.({ name: "analysis", status: "completed", result });
  return result;
}

async function runAutomationGoal(payload, executionId, cb) {
  if (!Array.isArray(payload?.steps)) throw new Error("Automation requires steps[]");
  
  for (const stepName of payload.steps) {
    // Notify frontend of each sub-step
    await recordStep(executionId, "automation_task", "running", `Initiating swarm task: ${stepName}`);
    
    // Simulate work
    await new Promise(r => setTimeout(r, 800)); 

    await recordStep(executionId, "automation_task", "completed", `Successfully finished: ${stepName}`, { task: stepName, status: "success" });
  }
  
  return { status: "all_tasks_dispatched" };
}

// ... Repeat similar logic for runHttpGoal, runWeatherGoal, etc.