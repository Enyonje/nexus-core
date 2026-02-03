// src/routes/goals.js
import { requireAuth } from "./auth.js";
import { z } from "zod";

/* ======================================================
   Goal Type Schemas
====================================================== */
const baseGoalSchema = z.object({
  goalType: z.string().min(1, "goalType is required"),
  payload: z.any(), // validated per type below
});

// Specific schemas per goalType
const schemasByType = {
  test: z.object({
    message: z.string().min(1, "message is required"),
  }),
  http_request: z.object({
    url: z.string().url("Valid URL required"),
    method: z.enum(["GET", "POST", "PUT", "DELETE"]).optional(),
    headers: z.record(z.string()).optional(),
    body: z.any().optional(),
  }),
  analysis: z.object({
    data: z.record(z.any(), { required_error: "data is required" }),
  }),
  automation: z.object({
    steps: z.array(z.string().min(1)).min(1, "At least one step required"),
  }),
  ai_analysis: z.object({
    prompt: z.string().min(1, "prompt is required"),
  }),
  ai_summary: z.object({
    text: z.string().min(1, "text is required"),
  }),
  ai_plan: z.object({
    objective: z.string().min(1, "objective is required"),
  }),
};

export async function goalsRoutes(app) {
  /* ======================================================
     CREATE GOAL
  ====================================================== */
  app.post("/", { preHandler: requireAuth }, async (req, reply) => {
    try {
      const userId = req.identity.sub;
      const { goalType, payload } = req.body;

      // Validate base
      const baseParse = baseGoalSchema.safeParse(req.body);
      if (!baseParse.success) {
        return reply.code(400).send({ error: baseParse.error.errors.map(e => e.message) });
      }

      // Validate payload by type
      const schema = schemasByType[goalType];
      if (!schema) {
        return reply.code(400).send({ error: `Unsupported goalType: ${goalType}` });
      }
      const payloadParse = schema.safeParse(payload);
      if (!payloadParse.success) {
        return reply.code(400).send({ error: payloadParse.error.errors.map(e => e.message) });
      }

      const result = await app.pg.query(
        `INSERT INTO goals (user_id, goal_type, goal_payload, created_at)
         VALUES ($1, $2, $3, NOW())
         RETURNING id, goal_type, goal_payload, created_at`,
        [userId, goalType, payload]
      );

      return reply.code(201).send(result.rows[0]);
    } catch (err) {
      app.log.error("Create goal failed:", err);
      return reply.code(500).send({ error: "Failed to create goal", detail: err.message });
    }
  });

  /* ======================================================
     GET USER GOALS
  ====================================================== */
  app.get("/", { preHandler: requireAuth }, async (req, reply) => {
    try {
      const userId = req.identity.sub;
      const result = await app.pg.query(
        `SELECT id, goal_type, goal_payload, created_at
         FROM goals
         WHERE user_id = $1
         ORDER BY created_at DESC`,
        [userId]
      );
      return reply.send(result.rows);
    } catch (err) {
      app.log.error("Fetch goals failed:", err);
      return reply.code(500).send({ error: "Failed to load goals", detail: err.message });
    }
  });

  /* ======================================================
     GET SINGLE GOAL
  ====================================================== */
  app.get("/:id", { preHandler: requireAuth }, async (req, reply) => {
    try {
      const userId = req.identity.sub;
      const { id } = req.params;
      const result = await app.pg.query(
        `SELECT id, goal_type, goal_payload, created_at
         FROM goals
         WHERE id = $1 AND user_id = $2`,
        [id, userId]
      );

      if (!result.rows.length) {
        return reply.code(404).send({ error: "Goal not found" });
      }

      return reply.send(result.rows[0]);
    } catch (err) {
      app.log.error("Fetch goal failed:", err);
      return reply.code(500).send({ error: "Failed to load goal", detail: err.message });
    }
  });
}