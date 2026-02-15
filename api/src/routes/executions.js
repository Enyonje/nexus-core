import { v4 as uuidv4 } from "uuid";
import { runExecution } from "../execution/runner.js";
import { requireAuth } from "./auth.js";

/* ===============================
   EVENT BUS (SSE PUB/SUB)
=============================== */
const subscribers = new Map(); // executionId -> Set of callbacks

export function publishEvent(executionId, event) {
  const subs = subscribers.get(executionId);
  if (subs) {
    for (const cb of subs) {
      try {
        cb(event);
      } catch (err) {
        subs.delete(cb); // Drop broken subscribers
      }
    }
    if (subs.size === 0) {
      subscribers.delete(executionId);
    }
  }
}

/* ===============================
   ADMIN GUARD
=============================== */
function requireAdmin(req, reply, next) {
  if (!req.identity || req.identity.role !== "admin") {
    return reply.code(403).send({ error: "Admin access required" });
  }
  next();
}

export async function executionsRoutes(app) {
  /* ===============================
     LIST EXECUTIONS (user-scoped)
  =============================== */
  app.get("/", { preHandler: requireAuth }, async (req, reply) => {
    try {
      const userId = req.identity.sub;
      const { rows } = await app.pg.query(
        `SELECT * FROM executions
         WHERE user_id = $1
         ORDER BY started_at DESC NULLS LAST`,
        [userId]
      );
      return { executions: rows };
    } catch (err) {
      req.log.error(err, "Failed to fetch executions");
      return reply.code(500).send({ error: "Failed to fetch executions" });
    }
  });

  /* ===============================
     CREATE EXECUTION
  =============================== */
  app.post("/", { preHandler: requireAuth }, async (req, reply) => {
    try {
      const userId = req.identity.sub;
      const orgId = req.identity.org_id;
      const { goalId } = req.body;
      if (!goalId) return reply.code(400).send({ error: "goalId is required" });

      const goalRes = await app.pg.query(
        `SELECT id, goal_type FROM goals WHERE id = $1 AND user_id = $2`,
        [goalId, userId]
      );
      if (goalRes.rows.length === 0) {
        return reply.code(404).send({ error: "Goal not found or not owned by user" });
      }

      const goal = goalRes.rows[0];
      const executionId = uuidv4();

      const execRes = await app.pg.query(
        `INSERT INTO executions (
           id, goal_id, goal_type, user_id, org_id, version, status, started_at
         )
         VALUES ($1, $2, $3, $4, $5, 1, 'pending', NOW())
         RETURNING *`,
        [executionId, goal.id, goal.goal_type, userId, orgId]
      );

      return reply.code(201).send(execRes.rows[0]);
    } catch (err) {
      req.log.error(err, "Failed to create execution");
      return reply.code(500).send({ error: "Failed to create execution" });
    }
  });

  /* ===============================
     RUN EXECUTION
  =============================== */
  app.post("/:id/run", { preHandler: requireAuth }, async (req, reply) => {
    try {
      const userId = req.identity.sub;
      const { id } = req.params;

      const execRes = await app.pg.query(
        `UPDATE executions
         SET status = 'running',
             started_at = COALESCE(started_at, NOW())
         WHERE id = $1 AND user_id = $2
         RETURNING *`,
        [id, userId]
      );

      if (execRes.rows.length === 0) {
        return reply.code(404).send({ error: "Execution not found or not owned by user" });
      }

      // ✅ Pass request body into runner
      const payloadOverride = req.body || {};

      runExecution(id, payloadOverride).catch((err) => {
        req.log.error(err, "Runner failed");
        publishEvent(id, { event: "execution_failed", error: err.message });
      });

      return execRes.rows[0];
    } catch (err) {
      req.log.error(err, "Failed to run execution");
      return reply.code(500).send({ error: "Failed to run execution" });
    }
  });

  /* ===============================
     GET SINGLE EXECUTION
  =============================== */
  app.get("/:id", { preHandler: requireAuth }, async (req, reply) => {
    try {
      const userId = req.identity.sub;
      const { id } = req.params;
      const execRes = await app.pg.query(
        `SELECT * FROM executions WHERE id = $1 AND user_id = $2`,
        [id, userId]
      );
      if (execRes.rows.length === 0) {
        return reply.code(404).send({ error: "Execution not found or not owned by user" });
      }
      return execRes.rows[0];
    } catch (err) {
      req.log.error(err, "Failed to fetch execution");
      return reply.code(500).send({ error: "Failed to fetch execution" });
    }
  });

  /* ===============================
     STREAM EXECUTION EVENTS (SSE)
  =============================== */
  app.get("/:id/stream", { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params;

    // Allow CORS for your frontend origins
    const origin = req.headers.origin;
    if (
      origin === "https://nexus-core-chi.vercel.app" ||
      origin?.startsWith("http://localhost")
    ) {
      reply.raw.setHeader("Access-Control-Allow-Origin", origin);
      reply.raw.setHeader("Access-Control-Allow-Credentials", "true");
    }

    // SSE headers
    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    // Callback to push events
    const cb = (event) => {
      reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    if (!subscribers.has(id)) subscribers.set(id, new Set());
    subscribers.get(id).add(cb);

    // Initial handshake event
    cb({ event: "connected", executionId: id });

    // Handle disconnect
    req.raw.on("close", () => {
      subscribers.get(id)?.delete(cb);
      if (subscribers.get(id)?.size === 0) {
        subscribers.delete(id);
      }
      reply.raw.end();
    });
  });

  /* ===============================
     GET EXECUTION LOGS
  =============================== */
  app.get("/:id/logs", { preHandler: requireAuth }, async (req, reply) => {
    try {
      const userId = req.identity.sub;
      const { id } = req.params;

      const execRes = await app.pg.query(
        `SELECT id FROM executions WHERE id = $1 AND user_id = $2`,
        [id, userId]
      );
      if (!execRes.rows.length) {
        return reply.code(404).send({ error: "Execution not found or not owned by user" });
      }

      const { rows } = await app.pg.query(
        `SELECT id, name, status, started_at, finished_at, output, error
         FROM execution_steps
         WHERE execution_id = $1
         ORDER BY started_at ASC`,
        [id]
      );

      return { logs: rows };
    } catch (err) {
      req.log.error(err, "Fetch execution logs failed");
      return reply.code(500).send({ error: "Failed to fetch execution logs", detail: err.message });
    }
  });

  /* ===============================
     ADMIN OVERRIDE DASHBOARD
  =============================== */
  app.get("/admin/override", { preHandler: requireAdmin }, async (req, reply) => {
    try {
      const { rows } = await app.pg.query(
        `SELECT * FROM executions ORDER BY started_at DESC NULLS LAST`
      );
      return { adminExecutions: rows };
    } catch (err) {
      req.log.error(err, "Admin fetch failed");
      return reply.code(500).send({ error: "Admin fetch failed" });
    }
  });

  /* ===============================
     ADMIN RERUN EXECUTION
  =============================== */
  app.post("/admin/:id/rerun", { preHandler: requireAdmin }, async (req, reply) => {
    try {
      const { id } = req.params;
      runExecution(id).catch((err) => {
        req.log.error(err, "Admin rerun failed");
        publishEvent(id, { event: "execution_failed", error: err.message });
      });
      return { success: true, message: `Execution ${id} rerun started` };
    } catch (err) {
      req.log.error(err, "Failed to rerun execution");
      return reply.code(500).send({ error: "Failed to rerun execution" });
    }
  });

    /* ===============================
     ADMIN DELETE EXECUTION
  =============================== */
  app.delete("/admin/:id", { preHandler: requireAdmin }, async (req, reply) => {
    try {
      const { id } = req.params;
      await app.pg.query(`DELETE FROM executions WHERE id = $1`, [id]);
      return { success: true, message: `Execution ${id} deleted` };
    } catch (err) {
      req.log.error(err, "Failed to delete execution");
      return reply.code(500).send({ error: "Failed to delete execution" });
    }
  });
}