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

        registerClient(executionId, reply);

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

  // List all goals for the current user
  server.get("/goals", { preHandler: requireAuth }, async (req, reply) => {
    try {
      const userId = req.user.id;
      const { rows } = await server.pg.query(
        `SELECT * FROM goals WHERE user_id=$1 ORDER BY created_at DESC`,
        [userId]
      );
      return reply.send(rows);
    } catch (err) {
      server.log.error("Goal list failed:", err);
      return reply.code(500).send({ error: "Failed to list goals" });
    }
  });

  // Get a single goal by ID
  server.get("/goals/:id", { preHandler: requireAuth }, async (req, reply) => {
    try {
      const { id } = req.params;
      const { rows } = await server.pg.query(
        `SELECT * FROM goals WHERE id=$1`,
        [id]
      );

      if (!rows.length) {
        return reply.code(404).send({ error: "Goal not found" });
      }

      return reply.send(rows[0]);
    } catch (err) {
      server.log.error("Goal fetch failed:", err);
      return reply.code(500).send({ error: "Failed to fetch goal" });
    }
  });

  // Create goal
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

  // Update goal
  server.put("/goals/:id", { preHandler: requireAuth }, async (req, reply) => {
    try {
      const { id } = req.params;
      const { title, description, status } = req.body;

      const { rows } = await server.pg.query(
        `UPDATE goals SET title=$2, description=$3, status=$4, updated_at=NOW()
         WHERE id=$1 RETURNING *`,
        [id, title, description, status]
      );
      if (!rows.length) {
        return reply.code(404).send({ error: "Goal not found" });
      }
      const goal = rows[0];

      publishEvent({ event: "goal_updated", executionId: goal.user_id, data: goal });
      return reply.send(goal);
    } catch (err) {
      server.log.error("Goal update failed:", err);
      return reply.code(500).send({ error: "Failed to update goal" });
    }
  });

  // Delete goal
  server.delete("/goals/:id", { preHandler: requireAuth }, async (req, reply) => {
    try {
      const { id } = req.params;

      const { rows } = await server.pg.query(
        `DELETE FROM goals WHERE id=$1 RETURNING *`,
        [id]
      );
      if (!rows.length) {
        return reply.code(404).send({ error: "Goal not found" });
      }

      const goal = rows[0];
      publishEvent({ event: "goal_deleted", executionId: goal.user_id, data: goal });
      return reply.send({ deleted: true, goal });
    } catch (err) {
      server.log.error("Goal deletion failed:", err);
      return reply.code(500).send({ error: "Failed to delete goal" });
    }
  });

  // ---------------- OBJECTIVES ----------------

  // List all objectives for a given goal
  server.get("/objectives", { preHandler: requireAuth }, async (req, reply) => {
    try {
      const { goal_id } = req.query;
      if (!goal_id) {
        return reply.code(400).send({ error: "goal_id is required" });
      }
      const { rows } = await server.pg.query(
        `SELECT * FROM objectives WHERE goal_id=$1 ORDER BY created_at DESC`,
        [goal_id]
      );
      return reply.send(rows);
    } catch (err) {
      server.log.error("Objective list failed:", err);
      return reply.code(500).send({ error: "Failed to list objectives" });
    }
  });

  // Get a single objective by ID
  server.get("/objectives/:id", { preHandler: requireAuth }, async (req, reply) => {
    try {
      const { id } = req.params;
      const { rows } = await server.pg.query(
        `SELECT * FROM objectives WHERE id=$1`,
        [id]
      );

      if (!rows.length) {
        return reply.code(404).send({ error: "Objective not found" });
      }

      return reply.send(rows[0]);
    } catch (err) {
      server.log.error("Objective fetch failed:", err);
      return reply.code(500).send({ error: "Failed to fetch objective" });
    }
  });

  // Create objective
  server.post("/objectives", { preHandler: requireAuth }, async (req, reply) => {
    try {
      const { goal_id, title, description } = req.body;
      if (!goal_id || !title) {
        return reply.code(400).send({ error: "goal_id and title are required" });
      }

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

  // Update objective
  server.put("/objectives/:id", { preHandler: requireAuth }, async (req, reply) => {
    try {
      const { id } = req.params;
      const { title, description, completed } = req.body;

      const { rows } = await server.pg.query(
        `UPDATE objectives SET title=$2, description=$3, completed=$4, updated_at=NOW()
         WHERE id=$1 RETURNING *`,
        [id, title, description, completed]
      );
      if (!rows.length) {
        return reply.code(404).send({ error: "Objective not found" });
      }
      const objective = rows[0];

      publishEvent({ event: "objective_updated", executionId: objective.goal_id, data: objective });
      return reply.send(objective);
    } catch (err) {
      server.log.error("Objective update failed:", err);
      return reply.code(500).send({ error: "Failed to update objective" });
    }
  });

  // Delete objective
  server.delete("/objectives/:id", { preHandler: requireAuth }, async (req, reply) => {
    try {
      const { id } = req.params;

      const { rows } = await server.pg.query(
        `DELETE FROM objectives WHERE id=$1 RETURNING *`,
        [id]
      );
      if (!rows.length) {
        return reply.code(404).send({ error: "Objective not found" });
      }

      const objective = rows[0];
      publishEvent({ event: "objective_deleted", executionId: objective.goal_id, data: objective });
      return reply.send({ deleted: true, objective });
    } catch (err) {
      server.log.error("Objective deletion failed:", err);
      return reply.code(500).send({ error: "Failed to delete objective" });
    }
  });

  // ---------------- EXECUTIONS ----------------

  // List all executions for the current user
  server.get("/executions", { preHandler: requireAuth }, async (req, reply) => {
    try {
      const userId = req.user.id;
      const { rows } = await server.pg.query(
        `SELECT * FROM executions WHERE user_id=$1 ORDER BY created_at DESC`,
        [userId]
      );
      return reply.send(rows);
    } catch (err) {
      server.log.error("Execution list failed:", err);
      return reply.code(500).send({ error: "Failed to list executions" });
    }
  });

  // Get a single execution by ID
  server.get("/executions/:id", { preHandler: requireAuth }, async (req, reply) => {
    try {
      const { id } = req.params;
      const { rows } = await server.pg.query(
        `SELECT * FROM executions WHERE id=$1`,
        [id]
      );

      if (!rows.length) {
        return reply.code(404).send({ error: "Execution not found" });
      }

      return reply.send(rows[0]);
    } catch (err) {
      server.log.error("Execution fetch failed:", err);
      return reply.code(500).send({ error: "Failed to fetch execution" });
    }
  });

  // Create new execution
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

  // Update execution
  server.put("/executions/:id", { preHandler: requireAuth }, async (req, reply) => {
    try {
      const { id } = req.params;
      const { action, details } = req.body;

      const { rows } = await server.pg.query(
        `UPDATE executions SET action=$2, details=$3, updated_at=NOW()
         WHERE id=$1 RETURNING *`,
        [id, action, details]
      );
      if (!rows.length) {
        return reply.code(404).send({ error: "Execution not found" });
      }
      const execution = rows[0];

      publishEvent({ event: "execution_updated", executionId: execution.goal_id || execution.user_id, data: execution });
      return reply.send(execution);
    } catch (err) {
      server.log.error("Execution update failed:", err);
      return reply.code(500).send({ error: "Failed to update execution" });
    }
  });

  // Delete execution
  server.delete("/executions/:id", { preHandler: requireAuth }, async (req, reply) => {
    try {
      const { id } = req.params;

      const { rows } = await server.pg.query(
        `DELETE FROM executions WHERE id=$1 RETURNING *`,
        [id]
      );
      if (!rows.length) {
        return reply.code(404).send({ error: "Execution not found" });
      }

      const execution = rows[0];
      publishEvent({ event: "execution_deleted", executionId: execution.goal_id || execution.user_id, data: execution });
      return reply.send({ deleted: true, execution });
    } catch (err) {
      server.log.error("Execution deletion failed:", err);
      return reply.code(500).send({ error: "Failed to delete execution" });
    }
  });
}