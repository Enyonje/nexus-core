import { v4 as uuidv4 } from "uuid";
import { runExecution } from "../execution/runner.js";
import { requireAuth } from "./auth.js";

/* ===============================
    EVENT BUS (SSE PUB/SUB)
=============================== */
const subscribers = new Map();

export function publishEvent(executionId, event) {
  const subs = subscribers.get(executionId);
  if (subs) {
    for (const cb of subs) {
      try {
        cb(event);
      } catch (err) {
        subs.delete(cb);
      }
    }
    if (subs.size === 0) subscribers.delete(executionId);
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

/* ===============================
    AUDIT & UTILS
=============================== */
async function auditLog(app, executionId, status, meta = {}) {
  try {
    await app.pg.query(
      `INSERT INTO execution_audit (id, execution_id, status, meta, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [uuidv4(), executionId, status, JSON.stringify(meta)]
    );
  } catch (err) {
    app.log.error(err, "Audit log failed");
  }
}

/* ===============================
    ROUTES
=============================== */
export async function executionsRoutes(app) {
  
  /* 1. LIST EXECUTIONS */
  app.get("/", { preHandler: requireAuth }, async (req, reply) => {
    try {
      const userId = req.user?.id;
      if (!userId) return reply.code(400).send({ error: "Missing user ID" });

      const { rows } = await app.pg.query(
        `SELECT * FROM executions 
         WHERE user_id = $1 
         ORDER BY started_at DESC NULLS LAST`,
        [userId]
      );
      return rows;
    } catch (err) {
      req.log.error(err, "Failed to fetch executions");
      return reply.code(500).send({ error: "Internal Server Error" });
    }
  });

  /* 2. CREATE EXECUTION */
  app.post("/", { preHandler: requireAuth }, async (req, reply) => {
    try {
      const userId = req.user?.id;
      if (!userId) return reply.code(400).send({ error: "Missing user ID" });

      const { goalId, schedule, recurring } = req.body;
      if (!goalId) return reply.code(400).send({ error: "goalId is required" });

      const goalRes = await app.pg.query(
        `SELECT id, goal_type FROM goals WHERE id = $1 AND user_id = $2`,
        [goalId, userId]
      );

      if (goalRes.rows.length === 0) {
        return reply.code(404).send({ error: "Goal not found" });
      }

      const goal = goalRes.rows[0];
      const executionId = uuidv4();

      const execRes = await app.pg.query(
        `INSERT INTO executions (
            id, goal_id, goal_type, user_id, status, started_at, schedule, recurring, version
         )
         VALUES ($1, $2, $3, $4, 'pending', NOW(), $5, $6, 1)
         RETURNING *`,
        [executionId, goal.id, goal.goal_type, userId, schedule || null, recurring || false]
      );

      return reply.code(201).send(execRes.rows[0]);
    } catch (err) {
      app.log.error(err, "Failed to create execution");
      return reply.code(500).send({ error: "Creation failed" });
    }
  });

  /* 3. RUN EXECUTION */
  app.post("/:id/run", { preHandler: requireAuth }, async (req, reply) => {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      const execRes = await app.pg.query(
        `UPDATE executions SET status = 'running', started_at = NOW() 
         WHERE id = $1 AND user_id = $2 RETURNING *`,
        [id, userId]
      );

      if (execRes.rows.length === 0) {
        return reply.code(404).send({ error: "Execution not found or access denied" });
      }

      const start = Date.now();

      runExecution(id, req.body || {})
        .then(async () => {
          const duration = Date.now() - start;
          await app.pg.query(
            `UPDATE executions SET duration_ms=$2, status='completed' WHERE id=$1`,
            [id, duration]
          );
          publishEvent(id, { event: "execution_completed", duration });
          auditLog(app, id, "completed", { duration });
        })
        .catch(async (err) => {
          await app.pg.query(`UPDATE executions SET status='failed' WHERE id=$1`, [id]);
          publishEvent(id, { event: "execution_failed", error: err.message });
          auditLog(app, id, "failed", { error: err.message });
        });

      return execRes.rows[0];
    } catch (err) {
      app.log.error(err, "Failed to run execution");
      return reply.code(500).send({ error: "Run failed" });
    }
  });

  /* 4. SSE STREAM */
  app.get("/:id/stream", { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params;
    const origin = req.headers.origin;

    const allowedOrigins = ["https://nexusthecore.com", "http://localhost:5173"];
    if (allowedOrigins.includes(origin)) {
      reply.raw.setHeader("Access-Control-Allow-Origin", origin);
      reply.raw.setHeader("Access-Control-Allow-Credentials", "true");
    }

    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    });

    const send = (payload) => reply.raw.write(`data: ${JSON.stringify(payload)}\n\n`);

    if (!subscribers.has(id)) subscribers.set(id, new Set());
    subscribers.get(id).add(send);

    send({ event: "nexus_connected", details: "Uplink Secure" });

    req.raw.on("close", () => {
      const subs = subscribers.get(id);
      if (subs) {
        subs.delete(send);
        if (subs.size === 0) subscribers.delete(id);
      }
    });
  });

  /* 5. GET SINGLE EXECUTION */
  app.get("/:id", { preHandler: requireAuth }, async (req, reply) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const { rows } = await app.pg.query(
        `SELECT * FROM executions WHERE id=$1 AND user_id=$2`,
        [id, userId]
      );
      if (rows.length === 0) return reply.code(404).send({ error: "Not found" });
      return rows[0];
    } catch (err) {
      app.log.error(err, "Failed to fetch execution");
      return reply.code(500).send({ error: "Internal Server Error" });
    }
  });

  /* 6. ADMIN OVERRIDES */
  app.get("/admin/all", { preHandler: requireAdmin }, async (req, reply) => {
    try {
      const { rows } = await app.pg.query(`SELECT * FROM executions ORDER BY started_at DESC`);
      return rows;
    } catch (err) {
      app.log.error(err, "Failed to fetch all executions");
      return reply.code(500).send({ error: "Internal Server Error" });
    }
  });
}
