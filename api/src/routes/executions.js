import { v4 as uuidv4 } from "uuid";
import { runExecution } from "../execution/runner.js";

/* ===============================
   SIMPLE EVENT BUS (SSE PUB/SUB)
=============================== */
const subscribers = new Map(); // executionId -> Set of callbacks

export function publishEvent(executionId, event) {
  const subs = subscribers.get(executionId);
  if (subs) {
    for (const cb of subs) {
      cb(event);
    }
  }
}

/* ===============================
   ADMIN GUARD
=============================== */
function requireAdmin(req, reply, next) {
  if (!req.user || req.user.role !== "admin") {
    return reply.code(403).send({ error: "Admin access required" });
  }
  next();
}

export async function executionsRoutes(app) {
  /* ===============================
     LIST EXECUTIONS
  =============================== */
  app.get("/", async (req, reply) => {
    try {
      const { rows } = await app.pg.query(`
        SELECT * FROM executions
        ORDER BY started_at DESC NULLS LAST
      `);
      return { executions: rows };
    } catch (err) {
      req.log.error(err);
      return reply.code(500).send({ error: "Failed to fetch executions" });
    }
  });

  /* ===============================
     CREATE EXECUTION
  =============================== */
  app.post("/", async (req, reply) => {
    try {
      const { goalId } = req.body;
      if (!goalId) return reply.code(400).send({ error: "goalId is required" });

      const goalRes = await app.pg.query(
        `SELECT id, goal_type FROM goals WHERE id = $1`,
        [goalId]
      );
      if (goalRes.rows.length === 0) {
        return reply.code(404).send({ error: "Goal not found" });
      }

      const goal = goalRes.rows[0];
      const executionId = uuidv4();

      const execRes = await app.pg.query(
        `
        INSERT INTO executions (
          id, goal_id, goal_type, version, status, started_at
        )
        VALUES ($1, $2, $3, 1, 'pending', NOW())
        RETURNING *
        `,
        [executionId, goal.id, goal.goal_type]
      );

      return reply.code(201).send(execRes.rows[0]);
    } catch (err) {
      req.log.error(err);
      return reply.code(500).send({ error: "Failed to create execution" });
    }
  });

  /* ===============================
     RUN EXECUTION
  =============================== */
  app.post("/:id/run", async (req, reply) => {
    try {
      const { id } = req.params;

      const execRes = await app.pg.query(
        `
        UPDATE executions
        SET status = 'running',
            started_at = COALESCE(started_at, NOW())
        WHERE id = $1
        RETURNING *
        `,
        [id]
      );

      if (execRes.rows.length === 0) {
        return reply.code(404).send({ error: "Execution not found" });
      }

      // Fire async runner with SSE publishing
      runExecution(id, publishEvent).catch((err) => {
        req.log.error("Runner failed:", err);
      });

      return execRes.rows[0];
    } catch (err) {
      req.log.error(err);
      return reply.code(500).send({ error: "Failed to run execution" });
    }
  });

  /* ===============================
     GET SINGLE EXECUTION
  =============================== */
  app.get("/:id", async (req, reply) => {
    try {
      const { id } = req.params;
      const execRes = await app.pg.query(
        `SELECT * FROM executions WHERE id = $1`,
        [id]
      );
      if (execRes.rows.length === 0) {
        return reply.code(404).send({ error: "Execution not found" });
      }
      return execRes.rows[0];
    } catch (err) {
      req.log.error(err);
      return reply.code(500).send({ error: "Failed to fetch execution" });
    }
  });

  /* ===============================
     STREAM EXECUTION EVENTS (SSE)
  =============================== */
  app.get("/:id/stream", async (req, reply) => {
    const { id } = req.params;

    // Explicit CORS headers for SSE
    const origin = req.headers.origin;
    if (
      origin === "https://nexus-core-chi.vercel.app" ||
      origin?.startsWith("http://localhost")
    ) {
      reply.raw.setHeader("Access-Control-Allow-Origin", origin);
      reply.raw.setHeader("Access-Control-Allow-Credentials", "true");
    }

    reply.raw.setHeader("Content-Type", "text/event-stream");
    reply.raw.setHeader("Cache-Control", "no-cache");
    reply.raw.setHeader("Connection", "keep-alive");
    reply.raw.flushHeaders();

    // Subscribe
    const cb = (event) => {
      reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
    };
    if (!subscribers.has(id)) subscribers.set(id, new Set());
    subscribers.get(id).add(cb);

    // Initial event
    cb({ event: "connected", executionId: id });

    // Cleanup
    req.raw.on("close", () => {
      subscribers.get(id)?.delete(cb);
      reply.raw.end();
    });
  });

  /* ===============================
     ADMIN OVERRIDE DASHBOARD
  =============================== */
  app.get("/admin/override", { preHandler: requireAdmin }, async (req, reply) => {
    try {
      const { rows } = await app.pg.query(`
        SELECT * FROM executions
        ORDER BY started_at DESC NULLS LAST
      `);
      return { adminExecutions: rows };
    } catch (err) {
      req.log.error(err);
      return reply.code(500).send({ error: "Admin fetch failed" });
    }
  });

  /* ===============================
     ADMIN RERUN EXECUTION
  =============================== */
  app.post("/admin/:id/rerun", { preHandler: requireAdmin }, async (req, reply) => {
    try {
      const { id } = req.params;
      runExecution(id, publishEvent).catch((err) => {
        req.log.error("Admin rerun failed:", err);
      });
      return { success: true, message: `Execution ${id} rerun started` };
    } catch (err) {
      req.log.error(err);
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
      req.log.error(err);
      return reply.code(500).send({ error: "Failed to delete execution" });
    }
  });
}