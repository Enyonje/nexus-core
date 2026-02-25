import { registerClient, getActiveStreams, publishEvent } from "../events/stream.js";
import { requireAuth } from "./auth.js";

export async function streamRoutes(server) {
  // STREAM EXECUTION EVENTS
  server.get(
    "/stream/:executionId",
    { preHandler: requireAuth },
    async (req, reply) => {
      try {
        const { executionId } = req.params;
        if (!executionId) {
          return reply.code(400).send({ error: "executionId is required" });
        }

        registerClient(Number(executionId), reply);

        reply.raw.on("close", () => {
          server.log.info(`Stream closed for execution ${executionId}`);
        });
      } catch (err) {
        server.log.error("Stream route failed:", err);
        return reply.code(500).send({ error: "Failed to open stream" });
      }
    }
  );

  // STREAM HEALTH CHECK
  server.get(
    "/stream/health",
    { preHandler: requireAuth },
    async (_req, reply) => {
      try {
        const active = getActiveStreams();
        return reply.send({ status: "ok", activeStreams: active });
      } catch (err) {
        server.log.error("Stream health check failed:", err);
        return reply.code(500).send({ error: "Failed to check stream health" });
      }
    }
  );

  // ---------------- GOALS ----------------
  server.post("/goals", { preHandler: requireAuth }, async (req, reply) => {
    try {
      const { title, description } = req.body;
      const userId = req.user.id;

      const { rows } = await server.pg.query(
        `INSERT INTO goals (user_id, title, description)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [userId, title, description]
      );
      const goal = rows[0];

      publishEvent({ event: "goal_created", executionId: userId, data: goal });
      return reply.send(goal);
    } catch (err) {
      server.log.error("Goal creation failed:", err);
      return reply.code(500).send({ error: "Failed to create goal" });
    }
  });

  server.put("/goals/:id", { preHandler: requireAuth }, async (req, reply) => {
    try {
      const { id } = req.params;
      const { title, description, status } = req.body;

      const { rows } = await server.pg.query(
        `UPDATE goals SET title=$2, description=$3, status=$4
         WHERE id=$1 RETURNING *`,
        [id, title, description, status]
      );
      const goal = rows[0];

      publishEvent({ event: "goal_updated", executionId: goal.user_id, data: goal });
      return reply.send(goal);
    } catch (err) {
      server.log.error("Goal update failed:", err);
      return reply.code(500).send({ error: "Failed to update goal" });
    }
  });

  server.delete("/goals/:id", { preHandler: requireAuth }, async (req, reply) => {
    try {
      const { id } = req.params;

      const { rows } = await server.pg.query(
        `DELETE FROM goals WHERE id=$1 RETURNING *`,
        [id]
      );
      const goal = rows[0];

      publishEvent({ event: "goal_deleted", executionId: goal.user_id, data: goal });
      return reply.send({ deleted: true, goal });
    } catch (err) {
      server.log.error("Goal deletion failed:", err);
      return reply.code(500).send({ error: "Failed to delete goal" });
    }
  });

  // ---------------- OBJECTIVES ----------------
  server.post("/objectives", { preHandler: requireAuth }, async (req, reply) => {
    try {
      const { goal_id, title, description } = req.body;

      const { rows } = await server.pg.query(
        `INSERT INTO objectives (goal_id, title, description)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [goal_id, title, description]
      );
      const objective = rows[0];

      publishEvent({ event: "objective_created", executionId: goal_id, data: objective });
      return reply.send(objective);
    } catch (err) {
      server.log.error("Objective creation failed:", err);
      return reply.code(500).send({ error: "Failed to create objective" });
    }
  });

  server.put("/objectives/:id", { preHandler: requireAuth }, async (req, reply) => {
    try {
      const { id } = req.params;
      const { title, description, completed } = req.body;

      const { rows } = await server.pg.query(
        `UPDATE objectives SET title=$2, description=$3, completed=$4
         WHERE id=$1 RETURNING *`,
        [id, title, description, completed]
      );
      const objective = rows[0];

      publishEvent({ event: "objective_updated", executionId: objective.goal_id, data: objective });
      return reply.send(objective);
    } catch (err) {
      server.log.error("Objective update failed:", err);
      return reply.code(500).send({ error: "Failed to update objective" });
    }
  });

  server.delete("/objectives/:id", { preHandler: requireAuth }, async (req, reply) => {
    try {
      const { id } = req.params;

      const { rows } = await server.pg.query(
        `DELETE FROM objectives WHERE id=$1 RETURNING *`,
        [id]
      );
      const objective = rows[0];

      publishEvent({ event: "objective_deleted", executionId: objective.goal_id, data: objective });
      return reply.send({ deleted: true, objective });
    } catch (err) {
      server.log.error("Objective deletion failed:", err);
      return reply.code(500).send({ error: "Failed to delete objective" });
    }
  });

  // ---------------- EXECUTIONS ----------------
  server.post("/executions", { preHandler: requireAuth }, async (req, reply) => {
    try {
      const { goal_id, objective_id, action, details } = req.body;
      const userId = req.user.id;

      const { rows } = await server.pg.query(
        `INSERT INTO executions (user_id, goal_id, objective_id, action, details)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [userId, goal_id, objective_id, action, details]
      );
      const execution = rows[0];

      publishEvent({ event: "execution_created", executionId: goal_id || userId, data: execution });
      return reply.send(execution);
    } catch (err) {
      server.log.error("Execution creation failed:", err);
      return reply.code(500).send({ error: "Failed to create execution" });
    }
  });

  server.put("/executions/:id", { preHandler: requireAuth }, async (req, reply) => {
    try {
      const { id } = req.params;
      const { action, details } = req.body;

      const { rows } = await server.pg.query(
        `UPDATE executions SET action=$2, details=$3
         WHERE id=$1 RETURNING *`,
        [id, action, details]
      );
      const execution = rows[0];

      publishEvent({ event: "execution_updated", executionId: execution.goal_id || execution.user_id, data: execution });
      return reply.send(execution);
    } catch (err) {
      server.log.error("Execution update failed:", err);
      return reply.code(500).send({ error: "Failed to update execution" });
    }
  });

  server.delete("/executions/:id", { preHandler: requireAuth }, async (req, reply) => {
    try {
      const { id } = req.params;

      const { rows } = await server.pg.query(
        `DELETE FROM executions WHERE id=$1 RETURNING *`,
        [id]
      );
      const execution = rows[0];

      publishEvent({ event: "execution_deleted", executionId: execution.goal_id || execution.user_id, data: execution });
      return reply.send({ deleted: true, execution });
    } catch (err) {
      server.log.error("Execution deletion failed:", err);
      return reply.code(500).send({ error: "Failed to delete execution" });
    }
  });
}