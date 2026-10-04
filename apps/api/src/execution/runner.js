// src/execution/runner.js
import { db } from "../db/db.js";
import { executeGoalLogic } from "./logic.js";
import { withRetry } from "./retry.js";
import { publishEvent, publishAudit } from "../events/publish.js";
import { runSentinel, summarizeBlockedSteps, preflightStep } from "../agents/sentinel.js";

/* =========================================================
   Plugin Registry (tools). A step's `tool` or `name` selects a plugin.
   Plugin signature: async (stepInfo, { signal }) => output
========================================================= */
const stepPlugins = new Map();

export function registerStepPlugin(name, handler) {
  if (typeof handler !== "function") {
    throw new Error(`Plugin handler for '${name}' must be a function.`);
  }
  stepPlugins.set(name, handler);
}

/* =========================================================
   Config & helpers
========================================================= */
const RISKY_STEPS = new Set(["ai_ml_inference", "send_email", "delete_data", "payment"]);
const COST_PER_1K_TOKENS = Number(process.env.COST_PER_1K_TOKENS || 0.003);
const STEP_TIMEOUT_MS = 30_000;

const isRisky = (s) =>
  s.risk === "high" ||
  RISKY_STEPS.has(s.name) ||
  RISKY_STEPS.has(s.tool) ||
  (s.payload?.method && String(s.payload.method).toUpperCase() !== "GET");

// Blocks the obvious SSRF targets. For full protection also resolve DNS and re-check the IP.
function assertSafeUrl(raw) {
  let u;
  try { u = new URL(raw); } catch { throw Object.assign(new Error("Invalid URL"), { retryable: false }); }
  if (!["http:", "https:"].includes(u.protocol)) throw Object.assign(new Error("Only http(s) URLs are allowed"), { retryable: false });
  const h = u.hostname.toLowerCase();
  if (h === "localhost" || h === "[::1]" || h.endsWith(".internal") || h.endsWith(".local") ||
    /^(0\.|10\.|127\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h)) {
    throw Object.assign(new Error("URL points to a private address"), { retryable: false });
  }
  return u.toString();
}

const withTimeout = (signal) =>
  signal && AbortSignal.any ? AbortSignal.any([signal, AbortSignal.timeout(STEP_TIMEOUT_MS)]) : AbortSignal.timeout(STEP_TIMEOUT_MS);

const parseMaybe = (v) => { if (typeof v !== "string") return v; try { return JSON.parse(v); } catch { return v; } };

/* =========================================================
   Payload Validation & Normalization
========================================================= */
function validatePayload(goalType, payload = {}) {
  const normalized = { ...payload };

  if (!normalized.parameters) {
    normalized.parameters = { threshold: 0.75, mode: "fast" };
  }

  switch (goalType) {
    case "processFile":
      if (!normalized.filePath) normalized.filePath = "uploads/default.txt";
      break;
    case "analysis":
    case "ai_generate":
      // The Goals form sends title/description/website, so analyse those before falling back to a placeholder
      if (!normalized.text || typeof normalized.text !== "string" || !normalized.text.trim()) {
        const composed = [normalized.title, normalized.description, normalized.website].filter(Boolean).join("\n");
        normalized.text = composed.trim() || "Default execution payload input";
      }
      break;
  }

  return normalized;
}

/* =========================================================
   Step Execution Dispatcher
========================================================= */
async function runStep(stepInfo, signal) {
  const plugin = stepPlugins.get(stepInfo.tool) || stepPlugins.get(stepInfo.name);
  if (plugin) return await plugin(stepInfo, { signal });

  // Work defined by the goal handler in logic.js
  if (typeof stepInfo.run === "function") return await stepInfo.run({ signal });

  switch (stepInfo.name) {
    case "fetchData": {
      const url = assertSafeUrl(stepInfo.payload?.url || "https://api.github.com/repos/vercel/vercel");
      const res = await fetch(url, { headers: { "User-Agent": "NexusCore-Runner/1.0" }, redirect: "error", signal: withTimeout(signal) });
      if (!res.ok) throw Object.assign(new Error(`Fetch failed with status ${res.status}`), { status: res.status });
      return { data: await res.json() };
    }
    case "http_request": {
      const { url, method = "GET", headers = {}, body } = stepInfo.payload || {};
      const verb = String(method).toUpperCase();
      const res = await fetch(assertSafeUrl(url), {
        method: verb,
        headers: { "User-Agent": "NexusCore-Runner/1.0", ...(headers && typeof headers === "object" ? headers : {}) },
        body: verb === "GET" || verb === "HEAD" || !body ? undefined : typeof body === "string" ? body : JSON.stringify(body),
        redirect: "error", // a redirect could point at an internal address
        signal: withTimeout(signal),
      });
      const text = await res.text();
      if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}`), { status: res.status });
      return { status: res.status, data: parseMaybe(text.slice(0, 20000)) };
    }
    case "processFile":
      return { processed: true, file: stepInfo.filePath || "unknown" };
    case "ai_generate":
      return { text: stepInfo.payload?.prompt ? `Generated response for: ${stepInfo.payload.prompt}` : "AI Output" };
    case "analysis":
      return { text: stepInfo.payload?.text || "Analysis result" };
    case "ai_ml_inference": {
      const endpoint = process.env.ML_INFERENCE_ENDPOINT || "https://ml-service/api/infer";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.INTERNAL_SERVICE_KEY || ""}` },
        body: JSON.stringify(stepInfo.payload || {}),
        signal: withTimeout(signal),
      });
      if (!res.ok) throw Object.assign(new Error(`ML inference upstream error: ${res.status}`), { status: res.status });
      return await res.json();
    }
    default:
      return { echo: stepInfo.payload || null };
  }
}

/* =========================================================
   Persistence helpers (execution_steps)
========================================================= */
// Upsert so a retry-from-step reuses the same row instead of adding a duplicate
const beginStep = (ex, s, status, meta) =>
  db.query(
    `INSERT INTO execution_steps (id, execution_id, user_id, org_id, name, step_type, status, reasoning, metadata, started_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())
     ON CONFLICT (id) DO UPDATE
       SET status=$7, error=NULL, output=NULL, finished_at=NULL, started_at=NOW(), metadata=$9`,
    [s.id, ex.id, ex.user_id, ex.org_id, s.name, s.step_type || s.name, status, s.reasoning || "", JSON.stringify(meta)]
  );

// A step the sentinel already marked 'blocked' keeps that status
const endStep = (id, { status, output = null, error = null, meta = {} }) =>
  db.query(
    `UPDATE execution_steps
        SET status = CASE WHEN status='blocked' THEN status ELSE $2 END,
            output=$3, error=$4, metadata=$5, finished_at=NOW()
      WHERE id=$1`,
    [id, status, output == null ? null : JSON.stringify(output), error, JSON.stringify(meta)]
  );

async function auditLog(executionId, status, meta = {}) {
  try {
    await db.query(
      `INSERT INTO execution_audit (id, execution_id, status, meta, created_at)
       VALUES (gen_random_uuid(), $1, $2, $3, NOW())`,
      [executionId, status, JSON.stringify(meta)]
    );
    await publishAudit(executionId, status, meta);
  } catch (err) {
    console.error(`[Runner:AuditError] Failed to register audit log for ${executionId}:`, err);
  }
}

/* =========================================================
   Main Orchestrator
   ctx (supplied by the route): { emit, checkpoint, requestApproval, signal, mode, fromStep }
========================================================= */
export async function runExecution(executionId, payloadOverride = null, ctx = {}) {
  const { rows } = await db.query(
    `SELECT e.id, e.goal_id, e.user_id, e.org_id, e.status,
            g.goal_type, g.goal_payload,
            u.subscription, u.role
     FROM executions e
     JOIN goals g ON g.id = e.goal_id
     JOIN users u ON u.id = e.user_id
     WHERE e.id = $1`,
    [executionId]
  );
  if (!rows.length) throw new Error(`Execution ${executionId} not found`);
  const execution = rows[0];

  if (execution.goal_type === "sensitive" && execution.role !== "admin") {
    throw new Error("Forbidden: Insufficient authorization for sensitive workflows.");
  }
  if (execution.subscription === "free") {
    throw new Error("Upgrade required: Pro or Enterprise plan needed to run executions.");
  }

  let payload = payloadOverride ? { ...execution.goal_payload, ...payloadOverride } : execution.goal_payload;
  payload = validatePayload(execution.goal_type, payload);

  // Guardrails saved from the Goals page (goal_payload.settings)
  const settings = execution.goal_payload?.settings ?? {};
  const mode = ctx.mode || payload.parameters?.mode || "fast";
  const policy = settings.approval || (mode === "accurate" ? "risky" : "never"); // risky | always | never
  const budget = Number(settings.budgetUsd) || 0;

  const emit = (e) => (ctx.emit ? ctx.emit(e) : publishEvent({ executionId, ...e }));
  const checkpoint = ctx.checkpoint || (async () => { });

  // Retry-from-step: reuse the outputs of steps that already completed
  const cache = new Map();
  if (ctx.fromStep) {
    const { rows: done } = await db.query(
      `SELECT id, output FROM execution_steps WHERE execution_id=$1 AND status='completed'`,
      [executionId]
    );
    done.forEach((r) => cache.set(String(r.id), parseMaybe(r.output)));
  }
  let reached = !ctx.fromStep;

  const start = Date.now();
  let spent = 0;
  let hasSentinelBlocked = false;

  try {
    await db.query(`UPDATE executions SET status = 'running', started_at = NOW() WHERE id = $1`, [executionId]);
    if (!ctx.fromStep) {
      await db.query(`UPDATE users SET executions_count = executions_count + 1 WHERE id = $1`, [execution.user_id]);
      await emit({ event: "execution_started", goalType: execution.goal_type });
      await auditLog(executionId, "started", { goalType: execution.goal_type, mode, policy });
    }

    /* The goal handler hands each step to this function */
    const executeStep = async (stepInfo) => {
      const stepId = String(stepInfo.id);

      if (!reached) {
        if (stepId === String(ctx.fromStep)) reached = true;
        else if (cache.has(stepId)) return cache.get(stepId);
      }
      await checkpoint(); // honours pause and cancel

      const risky = isRisky(stepInfo);
      const gated = !!ctx.requestApproval && (policy === "always" || (policy === "risky" && risky));
      const meta = {
        stepId,
        stepType: stepInfo.step_type || stepInfo.name,
        name: stepInfo.name,
        tool: stepInfo.tool || stepInfo.name,
        risk: stepInfo.risk,
        reasoning: stepInfo.reasoning,
      };
      const stored = { tool: meta.tool, risk: meta.risk };
      let attempts = 0;

      await beginStep(execution, stepInfo, gated ? "awaiting_approval" : "running", stored);

      const block = async (reason, alreadyRecorded) => {
        hasSentinelBlocked = true;
        if (!alreadyRecorded) {
          await db.query(`UPDATE execution_steps SET status='blocked', error=$2, finished_at=NOW() WHERE id=$1`, [stepId, reason]);
          await emit({ event: "sentinel_blocked", stepId, reason });
        }
        await auditLog(executionId, "step_blocked", { step: stepInfo.name, reason });
        const err = Object.assign(new Error(`Sentinel policy blocked step '${stepInfo.name}': ${reason}`), { handled: true });
        await emit({ event: "execution_step_failed", ...meta, error: err.message });
        throw err;
      };

      try {
        // Rules-only pre-flight on risky steps, before anything runs
        if (risky) {
          const pre = preflightStep(stepInfo);
          if (!pre.allowed) await block(pre.reason, false);
        }

        if (gated) {
          const approved = await ctx.requestApproval(stepId, meta);
          if (!approved) {
            await endStep(stepId, { status: "failed", error: "Rejected by user", meta: stored });
            await auditLog(executionId, "step_rejected", { step: stepInfo.name });
            throw Object.assign(new Error(`Step '${stepInfo.name}' was rejected`), { handled: true });
          }
          await db.query(`UPDATE execution_steps SET status='running' WHERE id=$1`, [stepId]);
          await checkpoint();
        } else {
          await emit({ event: "execution_step_started", ...meta });
        }

        const output = await withRetry(
          () => { attempts++; return runStep(stepInfo, ctx.signal); },
          { retries: 3, backoffMs: 500, timeoutMs: stepInfo.timeoutMs, executionId, stepId, signal: ctx.signal }
        );

        // Sentinel: rules always, LLM review in accurate mode or for risky steps
        const verdict = await runSentinel(executionId, stepInfo, output, { llm: policy !== "never" || risky });
        if (!verdict.allowed) await block(verdict.reason, true);

        const tokens = Number(output?.tokensUsed) || 0;
        const cost = Number(output?.costUsd) || (tokens / 1000) * COST_PER_1K_TOKENS;
        spent += cost;
        if (tokens) await db.query(`UPDATE users SET ai_used = ai_used + $2 WHERE id = $1`, [execution.user_id, tokens]);

        const retries = Math.max(0, attempts - 1);
        await endStep(stepId, { status: "completed", output, meta: { ...stored, tokens, costUsd: cost, retries } });
        await emit({ event: "execution_step_completed", ...meta, output, tokens, costUsd: cost, retries });

        if (budget && spent > budget) throw new Error(`Spend limit of $${budget} reached`);
        return output;
      } catch (err) {
        if (err.handled) throw err;
        if (ctx.signal?.aborted) {
          await endStep(stepId, { status: "failed", error: "Cancelled", meta: stored });
          throw err;
        }
        const retries = Math.max(0, attempts - 1);
        await endStep(stepId, { status: "failed", error: err.message, meta: { ...stored, retries } });
        await emit({ event: "execution_step_failed", ...meta, error: err.message, retries });
        throw err;
      }
    };

    const result = await executeGoalLogic(execution.goal_type, payload, executionId, executeStep);

    const duration = Date.now() - start;
    await db.query(
      `UPDATE executions SET status = 'completed', finished_at = NOW(), result = $2, duration_ms = $3 WHERE id = $1`,
      [executionId, JSON.stringify(result), duration]
    );
    await summarizeBlockedSteps(executionId);

    await emit({ event: "execution_completed", result, duration, costUsd: spent });
    await auditLog(executionId, "completed", { duration, costUsd: spent });
    return result;
  } catch (err) {
    // Cancelled by the user: the cancel route already recorded the final state
    if (ctx.signal?.aborted) throw err;

    const duration = Date.now() - start;
    const status = hasSentinelBlocked ? "blocked" : "failed";

    await db.query(
      `UPDATE executions SET status = $2, finished_at = NOW(), error = $3, duration_ms = $4 WHERE id = $1`,
      [executionId, status, err.message, duration]
    );
    if (hasSentinelBlocked) await summarizeBlockedSteps(executionId).catch(() => { });
    await emit({
      event: `execution_${status}`,
      error: err.message,
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
    await auditLog(executionId, status, { error: err.message });
    throw err;
  }
}