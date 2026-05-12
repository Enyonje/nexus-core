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
