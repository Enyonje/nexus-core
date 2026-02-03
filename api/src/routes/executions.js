// CREATE EXECUTION FROM GOAL (POST /executions)
server.post("/", { preHandler: requireAuth }, async (req, reply) => {
  const userId = req.identity.sub;
  const { goalId } = req.body;

  if (!goalId) {
    return reply.code(400).send({ error: "goalId is required" });
  }

  const client = await server.pg.connect();
  try {
    // Step 1: check goal exists and belongs to user
    const goalRes = await client.query(
      `SELECT id, goal_type, goal_payload 
       FROM goals 
       WHERE id = $1 AND user_id = $2`,   // ✅ use correct ownership column
      [goalId, userId]
    );

    if (goalRes.rows.length === 0) {
      return reply.code(404).send({ error: "Goal not found or not owned by user" });
    }

    const goal = goalRes.rows[0];

    // Step 2: insert execution
    const execRes = await client.query(
      `INSERT INTO executions (goal_id, goal_type, goal_payload, status, started_at)
       VALUES ($1, $2, $3, 'pending', NOW())
       RETURNING id, status, started_at, goal_id`,
      [goal.id, goal.goal_type, goal.goal_payload]
    );

    return reply.send(execRes.rows[0]);
  } catch (err) {
    server.log.error("Create execution failed:", err);
    return reply.code(500).send({ error: "Failed to create execution", detail: err.message });
  } finally {
    client.release();
  }
});