import { requireAuth } from "../security/authorize.js";

export async function goalsRoutes(app: any) {
  // Create a new goal
  app.post("/goals", { preHandler: requireAuth }, async (req: any, reply: any) => {
    const userId = req.identity?.sub;
    const { title, description } = req.body;

    if (!title) {
      return reply.code(400).send({ error: "Title is required" });
    }

    const result = await app.pg.query(
      `INSERT INTO goals (user_id, title, description, created_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING *`,
      [userId, title, description || null]
    );

    return { status: "accepted", goal: result.rows[0] };
  });

  // Fetch all goals for the current user
  app.get("/goals", { preHandler: requireAuth }, async (req: any, reply: any) => {
    const userId = req.identity?.sub;

    const result = await app.pg.query(
      "SELECT * FROM goals WHERE user_id = $1 ORDER BY created_at DESC",
      [userId]
    );

    return result.rows;
  });

  // Fetch a single goal by ID
  app.get("/goals/:id", { preHandler: requireAuth }, async (req: any, reply: any) => {
    const userId = req.identity?.sub;
    const { id } = req.params;

    const result = await app.pg.query(
      "SELECT * FROM goals WHERE id = $1 AND user_id = $2",
      [id, userId]
    );

    if (result.rows.length === 0) {
      return reply.code(404).send({ error: "Goal not found" });
    }

    return result.rows[0];
  });
}