// ...existing code...
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

      const { rows: executions } = await app.pg.query(
        `SELECT * FROM executions 
         WHERE user_id = $1 
         ORDER BY started_at DESC NULLS LAST`,
        [userId]
      );

      const { rows: userRows } = await app.pg.query(
        `SELECT id, email, role, subscription FROM users WHERE id=$1`,
        [userId]
      );

      return reply.send({
        user: userRows[0] || { id: userId, email: "", role: "user", subscription: "free" },
        executions,
        requiresSubscription: (userRows[0]?.subscription === "free")
      });
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

      await auditLog(app, executionId, "created", { goalId: goal.id, goalType: goal.goal_type });

      const { rows: userRows } = await app.pg.query(
        `SELECT id, email, role, subscription FROM users WHERE id=$1`,
        [userId]
      );

      return reply.code(201).send({
        user: userRows[0] || { id: userId, email: "", role: "user", subscription: "free" },
        execution: execRes.rows[0],
        requiresSubscription: (userRows[0]?.subscription === "free")
      });
    } catch (err) {
      app.log.error(err, "Failed to create execution");
      return reply.code(500).send({ error: "Creation failed" });
    }
  });

  /* 3. RUN EXECUTION */
  app.post("/:id/run", { preHandler: requireAuth }, async (req, reply) => {
    try {
      const userId = req.user?.id;
      const execId = req.params.id;

      // Defensive validation to avoid handling "undefined" or missing ids
      if (!execId || execId === "undefined") {
        app.log.warn({ url: req.url, params: req.params, user: userId }, "Missing or invalid execution id in request");
        return reply.code(400).send({ error: "MISSING_EXECUTION_ID", message: "Execution id is required" });
      }
      if (!userId) return reply.code(401).send({ error: "AUTH_INVALID_SESSION" });

      const execRes = await app.pg.query(
        `UPDATE executions SET status = 'running', started_at = NOW() 
         WHERE id = $1 AND user_id = $2 RETURNING *`,
        [execId, userId]
      );

      if (execRes.rows.length === 0) {
        return reply.code(404).send({ error: "Execution not found or access denied" });
      }

      const start = Date.now();
      await auditLog(app, execId, "started", {});

      // Run asynchronously; keep client response quick
      runExecution(execId, req.body || {})
        .then(async () => {
          const duration = Date.now() - start;
          await app.pg.query(
            `UPDATE executions SET duration_ms=$2, status='completed' WHERE id=$1`,
            [execId, duration]
          );
          publishEvent(execId, { event: "execution_completed", duration });
          await auditLog(app, execId, "completed", { duration });
        })
        .catch(async (err) => {
          await app.pg.query(`UPDATE executions SET status='failed' WHERE id=$1`, [execId]);
          publishEvent(execId, { event: "execution_failed", error: err?.message ?? String(err) });
          await auditLog(app, execId, "failed", { error: err?.message ?? String(err) });
        });

      const { rows: userRows } = await app.pg.query(
        `SELECT id, email, role, subscription FROM users WHERE id=$1`,
        [userId]
      );

      return reply.send({
        user: userRows[0] || { id: userId, email: "", role: "user", subscription: "free" },
        execution: execRes.rows[0],
        requiresSubscription: (userRows[0]?.subscription === "free")
      });
    } catch (err) {
      app.log.error(err, "Failed to run execution");
      return reply.code(500).send({ error: "Run failed" });
    }
  });

  /* 4. SSE STREAM, 5. AUDIT LOGS, 6. GET SINGLE EXECUTION, 7. ADMIN OVERRIDES */
  // These routes remain unchanged since they don’t need subscription info.
}
// ...existing code...