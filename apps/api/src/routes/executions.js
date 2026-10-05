// src/routes/executions.js
import { v4 as uuidv4 } from "uuid";
import { runExecution } from "../execution/runner.js";
import { requireAuth } from "../security/authMiddleware.js";
import {
  initRuntime, publishEvent, subscribe, createRun, endRun, getRun, abortRun,
  setPaused, decide, makeCtx, issueTicket, consumeTicket,
} from "../execution/runtime.js";

// Kept so existing imports (`import { publishEvent } from "../routes/executions.js"`) still work
export { publishEvent };

const TERMINAL_EVENTS = new Set(["execution_completed", "execution_failed", "execution_cancelled", "execution_blocked"]);
const TERMINAL_STATUS = new Set(["completed", "failed", "cancelled", "blocked"]);
const STEP_STATUS = {
  execution_step_started: "running", execution_step_progress: "running",
  execution_step_completed: "completed", execution_step_failed: "failed",
  execution_step_awaiting_approval: "awaiting_approval",
};

async function auditLog(app, executionId, status, meta = {}) {
  try {
    await app.pg.query(
      `INSERT INTO execution_audit (id, execution_id, status, meta, created_at) VALUES ($1, $2, $3, $4, NOW())`,
      [uuidv4(), executionId, status, JSON.stringify(meta)]
    );
  } catch (err) {
    app.log.error(err, "Audit log failed");
  }
}

const ownedExecution = async (app, execId, userId) =>
  (await app.pg.query(`SELECT * FROM executions WHERE id = $1 AND user_id = $2`, [execId, userId])).rows[0] || null;

// Rebuild the step list from persisted events so GET /:id always has `steps`
function foldSteps(rows) {
  const map = new Map();
  for (const { data: e } of rows) {
    const status = STEP_STATUS[e.event];
    if (!status) continue;
    const sid = String(e.stepId ?? e.step);
    const old = map.get(sid) || { id: sid, stepId: sid, started_at: e.at, retries: 0 };
    map.set(sid, {
      ...old,
      step_type: e.stepType ?? old.step_type ?? "task",
      status,
      output: e.output ?? e.partial ?? old.output ?? null,
      error: e.error ?? old.error ?? null,
      reasoning: e.reasoning ?? old.reasoning,
      tool: e.tool ?? old.tool,
      tokens: e.tokens ?? old.tokens,
      cost_usd: e.costUsd ?? old.cost_usd,
      retries: e.retries ?? old.retries,
      finished_at: status === "completed" || status === "failed" ? e.at : null,
    });
  }
  return [...map.values()];
}

export async function executionsRoutes(app) {
  initRuntime(app.pg);

  const authedUserId = (req, reply) => {
    const id = req.user?.id;
    if (!id) reply.code(401).send({ error: "AUTH_INVALID_SESSION" });
    return id;
  };
  const validId = (req, reply) => {
    const id = req.params.id;
    if (!id || id === "undefined") { reply.code(400).send({ error: "MISSING_EXECUTION_ID" }); return null; }
    return id;
  };

  /* Start (or resume from a step) a run, wiring events, cancellation and final status */
  function startRun(execId, { payloadOverride = null, fromStep = null, mode = "fast" } = {}) {
    const run = createRun(execId);
    const started = Date.now();
    const ctx = makeCtx(execId, run, { fromStep, mode });

    runExecution(execId, payloadOverride, ctx)
      .then(async () => {
        if (run.ac.signal.aborted) return;
        const duration = Date.now() - started;
        const { rowCount } = await app.pg.query(
          `UPDATE executions SET duration_ms=$2, status='completed' WHERE id=$1 AND status IN ('running','paused')`,
          [execId, duration]
        );
        if (rowCount) {
          await publishEvent(execId, { event: "execution_completed", duration });
          await auditLog(app, execId, "completed", { duration });
        }
      })
      .catch(async (err) => {
        if (run.ac.signal.aborted) return; // cancel route already recorded this
        // The runner records its own failures. This only catches errors thrown before it
        // could (not found, forbidden, upgrade required), so it is a no-op otherwise.
        const message = err?.message ?? String(err);
        const { rowCount } = await app.pg.query(
          `UPDATE executions SET status='failed', error=$2 WHERE id=$1 AND status IN ('pending','running','paused')`,
          [execId, message]
        );
        if (rowCount) {
          await publishEvent(execId, { event: "execution_failed", error: message });
          await auditLog(app, execId, "failed", { error: message });
        }
      })
      .finally(() => endRun(execId));
  }

  /* 1. LIST */
  app.get("/", { preHandler: requireAuth }, async (req, reply) => {
    try {
      const userId = authedUserId(req, reply);
      if (!userId) return;
      const [{ rows: executions }, { rows: userRows }] = await Promise.all([
        app.pg.query(`SELECT * FROM executions WHERE user_id = $1 ORDER BY started_at DESC NULLS LAST`, [userId]),
        app.pg.query(`SELECT id, email, role, subscription FROM users WHERE id=$1`, [userId]),
      ]);
      return reply.send({
        user: userRows[0] || { id: userId, email: "", role: "user", subscription: "free" },
        executions,
        requiresSubscription: userRows[0]?.subscription === "free",
      });
    } catch (err) {
      req.log.error(err, "Failed to fetch executions");
      return reply.code(500).send({ error: "Internal Server Error" });
    }
  });

  /* 2. CREATE */
  app.post("/", { preHandler: requireAuth }, async (req, reply) => {
    try {
      const userId = authedUserId(req, reply);
      if (!userId) return;
      const { goalId, schedule, recurring } = req.body || {};
      if (!goalId) return reply.code(400).send({ error: "goalId is required" });

      const goal = (await app.pg.query(`SELECT id, goal_type FROM goals WHERE id = $1 AND user_id = $2`, [goalId, userId])).rows[0];
      if (!goal) return reply.code(404).send({ error: "Goal not found" });

      const executionId = uuidv4();
      const { rows } = await app.pg.query(
        `INSERT INTO executions (id, goal_id, goal_type, user_id, status, started_at, schedule, recurring, version)
         VALUES ($1, $2, $3, $4, 'pending', NOW(), $5, $6, 1) RETURNING *`,
        [executionId, goal.id, goal.goal_type, userId, schedule || null, recurring || false]
      );
      await auditLog(app, executionId, "created", { goalId: goal.id, goalType: goal.goal_type });
      return reply.code(201).send({ execution: rows[0] });
    } catch (err) {
      app.log.error(err, "Failed to create execution");
      return reply.code(500).send({ error: "Creation failed" });
    }
  });

  /* 3. RUN (fresh run: clears previous events so the trace starts clean) */
  app.post("/:id/run", { preHandler: requireAuth }, async (req, reply) => {
    try {
      const userId = authedUserId(req, reply);
      const execId = userId && validId(req, reply);
      if (!execId) return;

      if (!(await ownedExecution(app, execId, userId))) return reply.code(404).send({ error: "Execution not found or access denied" });

      const { rows } = await app.pg.query(
        `UPDATE executions SET status='running', started_at=NOW(), duration_ms=NULL
         WHERE id=$1 AND user_id=$2 AND status NOT IN ('running','paused') RETURNING *`,
        [execId, userId]
      );
      if (!rows[0]) return reply.code(409).send({ error: "Execution is already running" });

      // Fresh run: clear the previous trace. The runner emits execution_started and the audit entry.
      await app.pg.query(`DELETE FROM execution_events WHERE execution_id=$1`, [execId]);
      await app.pg.query(`DELETE FROM execution_steps WHERE execution_id=$1`, [execId]);

      const body = req.body && typeof req.body === "object" ? req.body : {};
      startRun(execId, { payloadOverride: body.payloadOverride || null, mode: body.mode === "accurate" ? "accurate" : "fast" });
      return reply.send(rows[0]);
    } catch (err) {
      app.log.error(err, "Failed to run execution");
      return reply.code(500).send({ error: "Run failed" });
    }
  });

  /* 4. GET ONE (now includes steps) */
  app.get("/:id", { preHandler: requireAuth }, async (req, reply) => {
    try {
      const userId = authedUserId(req, reply);
      const execId = userId && validId(req, reply);
      if (!execId) return;
      const exec = await ownedExecution(app, execId, userId);
      if (!exec) return reply.code(404).send({ error: "Execution not found or access denied" });
      // execution_steps is the source of truth (written by the runner); fall back to events for older runs
      const { rows: stepRows } = await app.pg.query(
        `SELECT * FROM execution_steps WHERE execution_id=$1 ORDER BY started_at, id`,
        [execId]
      );
      if (stepRows.length) {
        const steps = stepRows.map((r) => {
          let m = r.metadata;
          if (typeof m === "string") { try { m = JSON.parse(m); } catch { m = {}; } }
          m = m || {};
          return { ...r, stepId: r.id, tool: m.tool, tokens: m.tokens, cost_usd: m.costUsd, retries: m.retries };
        });
        return reply.send({ ...exec, steps });
      }
      const { rows } = await app.pg.query(`SELECT data FROM execution_events WHERE execution_id=$1 ORDER BY id`, [execId]);
      return reply.send({ ...exec, steps: foldSteps(rows) });
    } catch (err) {
      req.log.error(err, "Failed to fetch execution");
      return reply.code(500).send({ error: "Internal Server Error" });
    }
  });

  /* 5. STREAM TICKET */
  app.post("/:id/stream-ticket", { preHandler: requireAuth }, async (req, reply) => {
    const userId = authedUserId(req, reply);
    const execId = userId && validId(req, reply);
    if (!execId) return;
    if (!(await ownedExecution(app, execId, userId))) return reply.code(404).send({ error: "Execution not found" });
    return reply.send({ ticket: issueTicket(userId, execId) });
  });

  /* 6. SSE STREAM: authenticated, replays history, then goes live */
  app.get("/:id/stream", async (req, reply) => {
    const execId = req.params.id;
    const { ticket, token } = req.query || {};

    let userId = null;
    if (ticket) {
      userId = consumeTicket(ticket, execId);
      if (!userId) return reply.code(401).send({ error: "INVALID_TICKET" });
    } else {
      if (token && !req.headers.authorization) req.headers.authorization = `Bearer ${token}`;
      await requireAuth(req, reply);
      if (reply.sent) return;
      userId = req.user?.id;
    }
    const exec = userId && (await ownedExecution(app, execId, userId));
    if (!exec) return reply.code(404).send({ error: "Execution not found or access denied" });

    // Take over the socket. Without hijack(), Fastify ends the response when this async handler returns.
    reply.hijack();
    const raw = reply.raw;
    raw.writeHead(200, {
      ...reply.getHeaders(), // carries CORS headers set by @fastify/cors (raw writeHead bypasses them)
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // stop nginx buffering the stream
    });
    req.raw.socket?.setTimeout?.(0);
    req.raw.socket?.setNoDelay?.(true);
    raw.write("retry: 3000\n\n");

    let maxSent = Number(req.headers["last-event-id"] || req.query?.lastEventId || 0);
    let replaying = true;
    let finished = false;
    const buffered = [];

    const finish = () => { if (!finished) { finished = true; setTimeout(() => raw.end(), 150); } };
    const deliver = (e) => {
      if (finished || (e.seq && e.seq <= maxSent)) return;
      raw.write(`${e.seq ? `id: ${e.seq}\n` : ""}data: ${JSON.stringify(e)}\n\n`);
      if (e.seq) maxSent = e.seq;
      if (TERMINAL_EVENTS.has(e.event)) finish();
    };

    // Subscribe BEFORE replaying so nothing is missed between the DB read and going live
    const unsubscribe = subscribe(execId, (e) => (replaying ? buffered.push(e) : deliver(e)));
    const heartbeat = setInterval(() => {
      if (!finished) raw.write(`data: ${JSON.stringify({ event: "execution_heartbeat", at: new Date().toISOString() })}\n\n`);
    }, 15_000);
    req.raw.on("close", () => { clearInterval(heartbeat); unsubscribe(); });

    try {
      const { rows } = await app.pg.query(
        `SELECT id, data FROM execution_events WHERE execution_id=$1 AND id > $2 ORDER BY id`,
        [execId, maxSent]
      );
      for (const r of rows) deliver({ ...r.data, seq: Number(r.id) });
      replaying = false;
      buffered.forEach(deliver);

      // Run finished before this client connected and left no terminal event: close it out
      const { rows: s } = await app.pg.query(`SELECT status FROM executions WHERE id=$1`, [execId]);
      if (!finished && !getRun(execId) && TERMINAL_STATUS.has(s[0]?.status)) {
        deliver({ event: `execution_${s[0].status}`, at: new Date().toISOString() });
      }
    } catch (err) {
      req.log.error(err, "Stream replay failed");
      replaying = false;
      buffered.forEach(deliver);
    }
  });

  /* 7. CONTROLS */
  const controlRoute = (path, handler) =>
    app.post(path, { preHandler: requireAuth }, async (req, reply) => {
      const userId = authedUserId(req, reply);
      const execId = userId && validId(req, reply);
      if (!execId) return;
      const exec = await ownedExecution(app, execId, userId);
      if (!exec) return reply.code(404).send({ error: "Execution not found or access denied" });
      try {
        return await handler({ req, reply, execId, exec });
      } catch (err) {
        req.log.error(err, `Control failed: ${path}`);
        return reply.code(500).send({ error: "Action failed" });
      }
    });

  controlRoute("/:id/pause", async ({ reply, execId }) => {
    if (!setPaused(execId, true)) return reply.code(409).send({ error: "Not running" });
    await app.pg.query(`UPDATE executions SET status='paused' WHERE id=$1`, [execId]);
    await publishEvent(execId, { event: "execution_paused" });
    await auditLog(app, execId, "paused");
    return reply.send({ ok: true });
  });

  controlRoute("/:id/resume", async ({ reply, execId }) => {
    if (!setPaused(execId, false)) return reply.code(409).send({ error: "Not running" });
    await app.pg.query(`UPDATE executions SET status='running' WHERE id=$1`, [execId]);
    await publishEvent(execId, { event: "execution_resumed" });
    await auditLog(app, execId, "resumed");
    return reply.send({ ok: true });
  });

  controlRoute("/:id/cancel", async ({ reply, execId }) => {
    if (!abortRun(execId)) return reply.code(409).send({ error: "Not running" });
    await app.pg.query(`UPDATE executions SET status='cancelled' WHERE id=$1`, [execId]);
    await publishEvent(execId, { event: "execution_cancelled" });
    await auditLog(app, execId, "cancelled");
    return reply.send({ ok: true });
  });

  controlRoute("/:id/steps/:stepId/approve", async ({ req, reply, execId }) => {
    const { stepId } = req.params;
    if (!decide(execId, stepId, true)) return reply.code(409).send({ error: "No approval pending for this step" });
    await publishEvent(execId, { event: "execution_step_started", stepId });
    await auditLog(app, execId, "step_approved", { stepId, by: req.user.id });
    return reply.send({ ok: true });
  });

  controlRoute("/:id/steps/:stepId/reject", async ({ req, reply, execId }) => {
    const { stepId } = req.params;
    if (!decide(execId, stepId, false)) return reply.code(409).send({ error: "No approval pending for this step" });
    await publishEvent(execId, { event: "execution_step_failed", stepId, error: "Rejected by user" });
    await auditLog(app, execId, "step_rejected", { stepId, by: req.user.id });
    return reply.send({ ok: true });
  });

  controlRoute("/:id/steps/:stepId/retry", async ({ req, reply, execId }) => {
    if (getRun(execId)) return reply.code(409).send({ error: "Execution is still active" });
    const { stepId } = req.params;
    await app.pg.query(
      `DELETE FROM execution_events WHERE execution_id=$1 AND type IN ('execution_failed','execution_blocked','execution_cancelled','execution_completed')`,
      [execId]
    );
    await app.pg.query(`UPDATE executions SET status='running', error=NULL WHERE id=$1`, [execId]);
    await publishEvent(execId, { event: "execution_resumed" });
    await auditLog(app, execId, "retry_from_step", { stepId });
    startRun(execId, { fromStep: stepId });
    return reply.send({ ok: true });
  });

  /* 8. AUDIT (ownership enforced; the old catch block referenced an undefined `rows`) */
  app.get("/:id/audit", { preHandler: requireAuth }, async (req, reply) => {
    try {
      const userId = authedUserId(req, reply);
      const execId = userId && validId(req, reply);
      if (!execId) return;
      if (!(await ownedExecution(app, execId, userId))) return reply.code(404).send({ error: "Execution not found or access denied" });
      const { rows } = await app.pg.query(`SELECT * FROM execution_audit WHERE execution_id = $1 ORDER BY created_at ASC`, [execId]);
      return reply.send({ logs: rows });
    } catch (err) {
      req.log.error(err, "Failed to fetch audit logs");
      return reply.code(500).send({ error: "Internal Server Error", logs: [] });
    }
  });

  /* 9. PURGE (the UI calls DELETE /executions/:id) */
  app.delete("/:id", { preHandler: requireAuth }, async (req, reply) => {
    try {
      const userId = authedUserId(req, reply);
      const execId = userId && validId(req, reply);
      if (!execId) return;
      if (!(await ownedExecution(app, execId, userId))) return reply.code(404).send({ error: "Execution not found or access denied" });
      abortRun(execId);
      await app.pg.query(`DELETE FROM execution_events WHERE execution_id=$1`, [execId]);
      await app.pg.query(`DELETE FROM execution_steps WHERE execution_id=$1`, [execId]);
      await app.pg.query(`DELETE FROM execution_audit WHERE execution_id=$1`, [execId]);
      await app.pg.query(`DELETE FROM executions WHERE id=$1 AND user_id=$2`, [execId, userId]);
      return reply.send({ ok: true });
    } catch (err) {
      req.log.error(err, "Failed to purge execution");
      return reply.code(500).send({ error: "Purge failed" });
    }
  });
}

// Explicit default so route registration never depends on export order
export default executionsRoutes;