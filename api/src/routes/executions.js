// src/routes/executions.js
import express from "express";
import { db } from "../db.js";
import { v4 as uuidv4 } from "uuid";

export const executionsRoutes = express.Router();

/* ======================================================
   GET /executions
   ====================================================== */
executionsRoutes.get("/", async (req, res) => {
  try {
    const executions = await db`
      SELECT *
      FROM executions
      ORDER BY started_at DESC NULLS LAST
    `;

    res.json({ executions });
  } catch (err) {
    console.error("GET /executions failed:", err);
    res.status(500).json({ error: "Failed to load executions" });
  }
});

/* ======================================================
   POST /executions
   Create execution from a goal
   ====================================================== */
executionsRoutes.post("/", async (req, res) => {
  try {
    const { goalId } = req.body;

    if (!goalId) {
      return res.status(400).json({ error: "goalId is required" });
    }

    // Pull goal info safely
    const [goal] = await db`
      SELECT id, goal_type
      FROM goals
      WHERE id = ${goalId}
    `;

    if (!goal) {
      return res.status(404).json({ error: "Goal not found" });
    }

    const [execution] = await db`
      INSERT INTO executions (
        id,
        goal_id,
        goal_type,
        version,
        status,
        started_at
      )
      VALUES (
        ${uuidv4()},
        ${goal.id},
        ${goal.goal_type},
        1,
        'pending',
        NOW()
      )
      RETURNING *
    `;

    res.status(201).json({ execution });
  } catch (err) {
    console.error("POST /executions failed:", err);
    res.status(500).json({ error: "Failed to create execution" });
  }
});

/* ======================================================
   POST /executions/:id/run
   ====================================================== */
executionsRoutes.post("/:id/run", async (req, res) => {
  try {
    const { id } = req.params;

    const [execution] = await db`
      UPDATE executions
      SET
        status = 'running',
        started_at = COALESCE(started_at, NOW())
      WHERE id = ${id}
      RETURNING *
    `;

    if (!execution) {
      return res.status(404).json({ error: "Execution not found" });
    }

    // (Later you’ll trigger workers / agents here)

    res.json({ execution });
  } catch (err) {
    console.error("POST /executions/:id/run failed:", err);
    res.status(500).json({ error: "Failed to run execution" });
  }
});

/* ======================================================
   GET /executions/:id
   ====================================================== */
executionsRoutes.get("/:id", async (req, res) => {
  try {
    const [execution] = await db`
      SELECT *
      FROM executions
      WHERE id = ${req.params.id}
    `;

    if (!execution) {
      return res.status(404).json({ error: "Execution not found" });
    }

    res.json({ execution });
  } catch (err) {
    console.error("GET /executions/:id failed:", err);
    res.status(500).json({ error: "Failed to load execution" });
  }
});
