// src/execution/runtime.js
// Event bus (persisted + replayable), run control (pause/cancel/approve), stream tickets.
import crypto from "node:crypto";

let db = null;
export const initRuntime = (pg) => { db = pg; };

const subs = new Map();   // execId -> Set<fn>
const tails = new Map();  // execId -> Promise (keeps events ordered)
const runs = new Map();   // execId -> run state
const tickets = new Map();

/* ---------------- Events ---------------- */
export function subscribe(execId, cb) {
    if (!subs.has(execId)) subs.set(execId, new Set());
    subs.get(execId).add(cb);
    return () => {
        const s = subs.get(execId);
        if (s) { s.delete(cb); if (!s.size) subs.delete(execId); }
    };
}

// Persists first (so late/reconnecting clients can replay), then fans out in order.
export function publishEvent(execId, event) {
    const prev = tails.get(execId) || Promise.resolve();
    const job = prev.then(async () => {
        const at = new Date().toISOString();
        let seq = null;
        if (db && event.event !== "execution_heartbeat") {
            try {
                const { rows } = await db.query(
                    `INSERT INTO execution_events (execution_id, type, data) VALUES ($1, $2, $3) RETURNING id`,
                    [execId, event.event, JSON.stringify({ ...event, at })]
                );
                seq = Number(rows[0].id);
            } catch (err) {
                console.error("[events] persist failed:", err.message);
            }
        }
        const msg = { ...event, at, ...(seq ? { seq } : {}) };
        for (const cb of [...(subs.get(execId) || [])]) {
            try { cb(msg); } catch { /* dead client, its close handler unsubscribes */ }
        }
    });
    const tail = job.catch(() => { });
    tails.set(execId, tail);
    tail.then(() => { if (tails.get(execId) === tail) tails.delete(execId); });
    return job;
}

/* ---------------- Run control ---------------- */
export function createRun(execId) {
    const run = { ac: new AbortController(), paused: false, waiters: [], approvals: new Map() };
    runs.set(execId, run);
    return run;
}
export const getRun = (id) => runs.get(id);
export const endRun = (id) => { const r = runs.get(id); if (r) { r.waiters.splice(0).forEach((w) => w()); runs.delete(id); } };

export function abortRun(id) {
    const r = runs.get(id);
    if (!r) return false;
    r.ac.abort();
    r.waiters.splice(0).forEach((w) => w());
    r.approvals.forEach((resolve) => resolve(false));
    r.approvals.clear();
    return true;
}
export function setPaused(id, paused) {
    const r = runs.get(id);
    if (!r) return false;
    r.paused = paused;
    if (!paused) r.waiters.splice(0).forEach((w) => w());
    return true;
}
export function decide(id, stepId, approved) {
    const r = runs.get(id);
    const resolve = r?.approvals.get(String(stepId));
    if (!resolve) return false;
    r.approvals.delete(String(stepId));
    resolve(approved);
    return true;
}

// What the runner receives as its 3rd argument
export function makeCtx(execId, run, extra = {}) {
    return {
        ...extra,
        signal: run.ac.signal,
        emit: (event) => publishEvent(execId, event),
        // call between steps: honours pause and cancel
        checkpoint: async () => {
            for (; ;) {
                if (run.ac.signal.aborted) throw new Error("Execution cancelled");
                if (!run.paused) return;
                await new Promise((r) => run.waiters.push(r));
            }
        },
        // resolves true/false when the user decides in the UI
        requestApproval: async (stepId, details = {}) => {
            await publishEvent(execId, { event: "execution_step_awaiting_approval", stepId: String(stepId), ...details });
            return new Promise((resolve) => run.approvals.set(String(stepId), resolve));
        },
    };
}

/* ---------------- Single-use stream tickets (keeps JWTs out of URLs) ---------------- */
export function issueTicket(userId, execId) {
    const ticket = crypto.randomBytes(24).toString("hex");
    tickets.set(ticket, { userId, execId, exp: Date.now() + 30_000 });
    setTimeout(() => tickets.delete(ticket), 31_000).unref();
    return ticket;
}
export function consumeTicket(ticket, execId) {
    const t = tickets.get(ticket);
    tickets.delete(ticket);
    return t && t.exp > Date.now() && t.execId === execId ? t.userId : null;
}