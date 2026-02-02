import { requireAuth } from "./auth.js";

export async function goalsRoutes(server) {
  // CREATE GOAL
  server.post("/", { preHandler: requireAuth }, async (req, reply) => {
    try {
      const userId = req.identity.sub;
      const { goalType, payload } = req.body;

      if (!goalType || !payload) {
        return reply.code(400).send({ error: "goalType and payload are required" });
      }

      const client = await server.pg.connect();
      const result = await client.query(
        `INSERT INTO goals (submitted_by, goal_type, goal_payload, created_at)
         VALUES ($1, $2, $3, NOW())
         RETURNING id, goal_type, goal_payload, created_at`,
        [userId, goalType, payload]
      );
      client.release();

      return reply.send(result.rows[0]);
    } catch (err) {
      server.log.error("Create goal failed:", err);
      return reply.code(500).send({ error: "Failed to create goal" });
    }
  });

  // GET USER GOALS
  server.get("/", { preHandler: requireAuth }, async (req, reply) => {
    try {
      const userId = req.identity.sub;
      const client = await server.pg.connect();
      const result = await client.query(
        `SELECT id, goal_type, goal_payload, created_at
         FROM goals
         WHERE submitted_by = $1
         ORDER BY created_at DESC`,
        [userId]
      );
      client.release();
      return reply.send(result.rows);
    } catch (err) {
      server.log.error("Fetch goals failed:", err);
      return reply.code(500).send({ error: "Failed to load goals" });
    }
  });

  // GET SINGLE GOAL
  server.get("/:id", { preHandler: requireAuth }, async (req, reply) => {
    try {
      const userId = req.identity.sub;
      const { id } = req.params;
      const client = await server.pg.connect();
      const result = await client.query(
        `SELECT id, goal_type, goal_payload, created_at
         FROM goals
         WHERE id = $1 AND submitted_by = $2`,
        [id, userId]
      );
      client.release();

      if (!result.rows.length) {
        return reply.code(404).send({ error: "Goal not found" });
      }

      return reply.send(result.rows[0]);
    } catch (err) {
      server.log.error("Fetch goal failed:", err);
      return reply.code(500).send({ error: "Failed to load goal" });
    }
  });
}