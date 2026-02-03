import { v4 as uuidv4 } from "uuid";
import { runExecution } from "../execution/runner.js";

// Simple role-based guard
function requireAdmin(req, reply, next) {
  if (!req.user || req.user.role !== "admin") {
    return reply.code(403).send({ error: "Admin access required" });
  }
  next();
}

export async function executionsRoutes(app) {
  /* LIST EXECUTIONS */
  app.get("/", async (req, reply) => {
    const { rows } = await app.pg.query(
      `SELECT * FROM executions ORDER BY started_at DESC NULLS LAST`
    );
    return { executions: rows };
  });

  /* CREATE EXECUTION */
  app.post("/", async (req, reply) => {
    const { goalId } = req.body;
    if (!goalId) {
      return reply.code(400).send({ error: "goalId is required" });
    }

    const goalRes = await app.pg.query(
      `SELECT id, goal_type, goal_payload FROM goals WHERE id = $1`,
      [goalId]
    );
    if (goalRes.rows.length === 0) {
      return reply.code(404).send({ error: "Goal not found" });
    }
    const goal = goalRes.rows[0];

    const execRes = await app.pg.query(
      `INSERT INTO executions (id, goal_id, goal_type, goal_payload, version, status, started_at)
       VALUES ($1, $2, $3, $4, 1, 'pending', NOW())
       RETURNING id, goal_id, goal_type, goal_payload, status, started_at`,
      [uuidv4(), goal.id, goal.goal_type, goal.goal_payload]
    );

    return reply.code(201).send(execRes.rows[0]);
  });

  /* RUN EXECUTION */
  app.post("/:id/run", async (req, reply) => {
    const { id } = req.params;
    const execRes = await app.pg.query(
      `UPDATE executions
       SET status = 'running', started_at = COALESCE(started_at, NOW())
       WHERE id = $1
       RETURNING id, goal_id, goal_type, goal_payload, status, started_at`,
      [id]
    );
    if (execRes.rows.length === 0) {
      return reply.code(404).send({ error: "Execution not found" });
    }

    runExecution(id).catch(err => req.log.error("Runner failed:", err));
    return reply.send(execRes.rows[0]);
  });

  /* GET SINGLE EXECUTION */
  app.get("/:id", async (req, reply) => {
    const { id } = req.params;
    const execRes = await app.pg.query(
      `SELECT * FROM executions WHERE id = $1`,
      [id]
    );
    if (execRes.rows.length === 0) {
      return reply.code(404).send({ error: "Execution not found" });
    }
    return execRes.rows[0];
  });

  /* STREAM EXECUTION EVENTS (SSE) */
  app.get("/:id/stream", async (req, reply) => {
    const { id } = req.params;

    reply.raw.setHeader("Content-Type", "text/event-stream");
    reply.raw.setHeader("Cache-Control", "no-cache");
    reply.raw.setHeader("Connection", "keep-alive");
    reply.raw.flushHeaders();

    const unsubscribe = app.eventBus.subscribe(id, (event) => {
      reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
    });

    req.raw.on("close", () => {
      unsubscribe();
      reply.raw.end();
    });
  });

  /* ADMIN OVERRIDE DASHBOARD */
  app.get("/admin/override", { preHandler: requireAdmin }, async (req, reply) => {
    const { rows } = await app.pg.query(
      `SELECT * FROM executions ORDER BY started_at DESC NULLS LAST`
    );
    return { adminExecutions: rows };
  });
}