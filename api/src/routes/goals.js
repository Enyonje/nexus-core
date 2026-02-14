import { requireAuth } from "./auth.js";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

/* ======================================================
   Goal Type Schemas
====================================================== */
const baseGoalSchema = z.object({
  goalType: z.string().min(1, "goalType is required"),
  payload: z.any(),
});

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
    title: z.string().min(1, "title is required"),
    description: z.string().min(1, "description is required"),
    website: z.string().url("Valid organization website required").optional(),
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
  /* CREATE GOAL */
  app.post("/", { preHandler: requireAuth }, async (req, reply) => {
    try {
      const userId = req.identity?.sub;
      const orgId = req.identity?.org_id;
      const { goalType, payload } = req.body;

      if (!userId || !orgId) {
        return reply.code(400).send({ error: "Missing userId or orgId in token" });
      }

      const baseParse = baseGoalSchema.safeParse(req.body);
      if (!baseParse.success) {
        const messages = baseParse.error?.errors?.map((e) => e.message) || ["Invalid request"];
        return reply.code(400).send({ error: messages });
      }

      const schema = schemasByType[goalType];
      if (!schema) {
        return reply.code(400).send({ error: `Unsupported goalType: ${goalType}` });
      }

      const payloadParse = schema.safeParse(payload);
      if (!payloadParse.success) {
        const messages = payloadParse.error?.errors?.map((e) => e.message) || ["Invalid payload"];
        return reply.code(400).send({ error: messages });
      }

      const result = await app.pg.query(
        `INSERT INTO goals (id, org_id, user_id, goal_type, goal_payload, created_at)
         VALUES ($1, $2, $3, $4, $5::jsonb, NOW())
         RETURNING id, goal_type, goal_payload, created_at`,
        [uuidv4(), orgId, userId, goalType, JSON.stringify(payload)]
      );

      return reply.code(201).send(result.rows[0]);
    } catch (err) {
      app.log.error({ err }, "Create goal failed");
      return reply.code(500).send({
        error: "Failed to create goal",
        detail: err.message,
      });
    }
  });

  /* GET USER GOALS */
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
      app.log.error({ err }, "Fetch goals failed");
      return reply.code(500).send({ error: "Failed to load goals", detail: err.message });
    }
  });

  /* GET SINGLE GOAL */
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
      app.log.error({ err }, "Fetch goal failed");
      return reply.code(500).send({ error: "Failed to load goal", detail: err.message });
    }
  });

  /* DELETE GOAL */
  app.delete("/:id", { preHandler: requireAuth }, async (req, reply) => {
    try {
      const userId = req.identity.sub;
      const { id } = req.params;

      const result = await app.pg.query(
        `DELETE FROM goals WHERE id = $1 AND user_id = $2 RETURNING id`,
        [id, userId]
      );

      if (!result.rows.length) {
        return reply.code(404).send({ error: "Goal not found or not owned by user" });
      }

      return { success: true, message: `Goal ${id} deleted` };
    } catch (err) {
      app.log.error({ err }, "Delete goal failed");
      return reply.code(500).send({ error: "Failed to delete goal", detail: err.message });
    }
  });
}