// src/components/ExecutionDetail.jsx
import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiFetch, safeApiFetch } from "../lib/api";
import { useToast } from "./ToastContext.jsx";
import LoadingSpinner from "./LoadingSpinner.jsx";
import { useAuth } from "../hooks/useAuth";
import SubscriptionGuard from "./SubscriptionGuard";

const STEP_EVENTS = {
  execution_step_started: "running",
  execution_step_progress: "running",
  execution_step_completed: "completed",
  execution_step_failed: "failed",
  execution_step_awaiting_approval: "awaiting_approval",
};
const EXEC_EVENTS = {
  execution_completed: "completed",
  execution_failed: "failed",
  execution_blocked: "blocked",
  execution_paused: "paused",
  execution_resumed: "running",
  execution_cancelled: "cancelled",
};
const ACTIVE = ["running", "pending", "paused"];

const TONE = {
  completed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  failed: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  awaiting_approval: "bg-violet-500/10 text-violet-300 border-violet-500/30",
  running: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
};
const BAR = {
  completed: "bg-emerald-500/70",
  failed: "bg-rose-500/70",
  awaiting_approval: "bg-violet-400/70",
  running: "bg-cyan-400/70 animate-pulse",
};

const ms = (a, b) => (a && b ? Math.max(0, new Date(b) - new Date(a)) : null);
const fmtMs = (v) => (v == null ? "—" : v < 1000 ? `${v} ms` : `${(v / 1000).toFixed(1)} s`);
const sum = (arr, key) => arr.reduce((t, s) => t + (Number(s[key]) || 0), 0);

function ExecutionDetailContent() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { initializing } = useAuth();

  const [execution, setExecution] = useState(null);
  const [steps, setSteps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [mode, setMode] = useState(() => localStorage.getItem("mode") || "fast");
  const [showMetrics, setShowMetrics] = useState(() => localStorage.getItem("showMetrics") !== "false");
  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("timeline");
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState({});
  const [busy, setBusy] = useState(null);
  const addToastRef = useRef(addToast);
  addToastRef.current = addToast;

  /* ---------- Data + resilient SSE (backoff, ticket auth, no duplicate toasts) ---------- */
  useEffect(() => {
    if (initializing) return;
    let src = null;
    let timer = null;
    let attempt = 0;
    let closed = false;

    const applyStep = (data, status) =>
      setSteps((prev) => {
        const sid = String(data.stepId || data.step);
        const i = prev.findIndex((s) => String(s.id) === sid || String(s.stepId) === sid);
        const now = new Date().toISOString();
        const old = i >= 0 ? prev[i] : {};
        const next = {
          ...old,
          id: sid,
          stepId: sid,
          step_type: data.stepType || old.step_type || "task",
          status,
          output: data.output ?? data.partial ?? old.output ?? null,
          error: data.error ?? old.error ?? null,
          reasoning: data.reasoning ?? old.reasoning,
          tool: data.tool ?? old.tool,
          tokens: data.tokens ?? old.tokens,
          cost_usd: data.costUsd ?? old.cost_usd,
          retries: data.retries ?? old.retries,
          started_at: old.started_at || data.startedAt || now,
          finished_at: ["completed", "failed"].includes(status) ? data.finishedAt || now : old.finished_at || null,
        };
        if (i < 0) return [...prev, next];
        const copy = [...prev];
        copy[i] = next;
        return copy;
      });

    const getStreamUrl = async () => {
      const base = `${import.meta.env.VITE_API_URL}/api/executions/${id}/stream`;
      try {
        // Preferred: short-lived single-use ticket so the JWT never lands in URLs/logs
        const { ticket } = await apiFetch(`/executions/${id}/stream-ticket`, { method: "POST" });
        if (ticket) return `${base}?ticket=${encodeURIComponent(ticket)}`;
      } catch { /* fall back below */ }
      const token = localStorage.getItem("token") || localStorage.getItem("authToken");
      return token ? `${base}?token=${encodeURIComponent(token)}` : null;
    };

    const connect = async () => {
      if (closed) return;
      const url = await getStreamUrl();
      if (!url || closed) return setConnectionStatus("disconnected");
      src = new EventSource(url);
      src.onopen = () => { attempt = 0; setConnectionStatus("connected"); };
      src.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (STEP_EVENTS[data.event]) applyStep(data, STEP_EVENTS[data.event]);
          else if (EXEC_EVENTS[data.event]) {
            const status = EXEC_EVENTS[data.event];
            setExecution((p) => (p ? { ...p, status } : p));
            if (["completed", "failed", "blocked", "cancelled"].includes(status)) {
              addToastRef.current(`Execution ${status}`, status === "completed" ? "success" : "error");
              src?.close();
              setConnectionStatus("disconnected");
            }
          }
        } catch (err) {
          console.error("[SSE Parse Error]", err);
        }
      };
      src.onerror = () => {
        src.close();
        if (closed) return;
        setConnectionStatus("reconnecting");
        const delay = Math.min(30000, 1000 * 2 ** attempt++) + Math.random() * 500;
        timer = setTimeout(connect, delay);
      };
    };

    (async () => {
      try {
        setLoading(true);
        const res = await apiFetch(`/executions/${id}`);
        setExecution(res);
        setSteps(Array.isArray(res.steps) ? res.steps : []);
        if (ACTIVE.includes(res.status) || res.status === "awaiting_approval") connect();
      } catch {
        addToastRef.current("Execution trace unreachable", "error");
      } finally {
        setLoading(false);
      }
    })();

    return () => {
      closed = true;
      clearTimeout(timer);
      src?.close();
      setConnectionStatus("disconnected");
    };
  }, [id, initializing]);

  /* ---------- Agent control actions ---------- */
  const act = useCallback(
    async (key, path, body, okMsg) => {
      setBusy(key);
      try {
        await apiFetch(`/executions/${id}${path}`, {
          method: "POST",
          body: body ? JSON.stringify(body) : undefined,
        });
        addToast(okMsg, "success");
      } catch {
        addToast(`Action failed: ${key}`, "error");
      } finally {
        setBusy(null);
      }
    },
    [id, addToast]
  );

  const handleRun = () => act("run", "/run", { mode }, `Dispatched in ${mode} mode`);
  const handlePause = () => act("pause", "/pause", null, "Pause requested");
  const handleResume = () => act("resume", "/resume", null, "Resumed");
  const handleCancel = () => window.confirm("Cancel this run? Completed steps are kept.") && act("cancel", "/cancel", null, "Cancel requested");
  const decide = (stepId, decision) => act(`${decision}:${stepId}`, `/steps/${stepId}/${decision}`, null, decision === "approve" ? "Step approved" : "Step rejected");
  const retryFrom = (stepId) => act(`retry:${stepId}`, `/steps/${stepId}/retry`, null, "Retrying from this step");

  const copyTraceId = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      addToast("Trace ID copied", "success");
    } catch {
      addToast("Clipboard failed", "error");
    }
  }, [id, addToast]);

  const exportTraceLogs = useCallback(() => {
    const blob = new Blob([JSON.stringify({ traceId: id, exportedAt: new Date().toISOString(), metadata: execution, steps }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nexus_audit_${id.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [id, execution, steps]);

  const handlePurge = useCallback(async () => {
    if (!window.confirm("Permanently purge this execution trace? This cannot be undone.")) return;
    try {
      await safeApiFetch(`/executions/${id}`, { method: "DELETE" }, addToast);
      navigate("/executions");
    } catch {
      addToast("Failed to purge execution trace", "error");
    }
  }, [id, addToast, navigate]);

  /* ---------- Derived ---------- */
  const filteredSteps = useMemo(() => {
    const q = search.trim().toLowerCase();
    return steps.filter(
      (s) =>
        (filterStatus === "all" || s.status === filterStatus) &&
        (!q || JSON.stringify([s.step_type, s.tool, s.error, s.output, s.reasoning]).toLowerCase().includes(q))
    );
  }, [steps, filterStatus, search]);

  const stats = useMemo(() => {
    const times = steps.map((s) => s.started_at && new Date(s.started_at).getTime()).filter(Boolean);
    const ends = steps.map((s) => (s.finished_at ? new Date(s.finished_at).getTime() : Date.now()));
    const t0 = times.length ? Math.min(...times) : 0;
    const span = times.length ? Math.max(...ends) - t0 : 0;
    return { t0, span: Math.max(span, 1), tokens: sum(steps, "tokens"), cost: sum(steps, "cost_usd"), retries: sum(steps, "retries") };
  }, [steps]);

  const pendingApprovals = steps.filter((s) => s.status === "awaiting_approval");
  const status = execution?.status;
  const isLive = ACTIVE.includes(status) || pendingApprovals.length > 0;

  if (loading || initializing) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <LoadingSpinner label="Loading execution trace..." />
      </div>
    );
  }

  const btn = "px-3.5 py-2 text-xs font-medium rounded-lg border transition-colors disabled:opacity-40 disabled:cursor-not-allowed";
  const neutral = `${btn} bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700`;

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 p-4 md:p-8 font-sans selection:bg-cyan-500 selection:text-black">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between border-b border-slate-800 pb-6 mb-6 gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white">Execution trace</h1>
            <span className="text-xs font-mono bg-slate-800 text-slate-400 px-2.5 py-1 rounded-md border border-slate-700">{id}</span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${connectionStatus === "connected" ? TONE.completed : "bg-amber-500/10 text-amber-400 border-amber-500/20"}`}>
              ● {connectionStatus}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Live steps, agent reasoning, approvals and cost for this run.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {status === "running" && <button onClick={handlePause} disabled={!!busy} className={neutral}>Pause</button>}
          {status === "paused" && <button onClick={handleResume} disabled={!!busy} className={`${btn} bg-cyan-600 hover:bg-cyan-500 text-white border-cyan-400/30`}>Resume</button>}
          {isLive && <button onClick={handleCancel} disabled={!!busy} className={`${btn} bg-amber-950/40 hover:bg-amber-900/50 text-amber-300 border-amber-800/40`}>Cancel run</button>}
          {!isLive && <button onClick={handleRun} disabled={!!busy} className={`${btn} bg-cyan-600 hover:bg-cyan-500 text-white border-cyan-400/30 shadow-lg shadow-cyan-900/20`}>Run again</button>}
          <button onClick={copyTraceId} className={neutral}>{copied ? "Copied" : "Copy trace ID"}</button>
          <button onClick={exportTraceLogs} className={neutral}>Export logs</button>
          <button onClick={handlePurge} className={`${btn} bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 border-rose-800/40`}>Purge</button>
        </div>
      </div>

      {/* Approval banner: human-in-the-loop */}
      {pendingApprovals.length > 0 && (
        <div className="mb-6 rounded-xl border border-violet-500/30 bg-violet-500/5 p-4" role="alert">
          <p className="text-sm font-semibold text-violet-200">
            {pendingApprovals.length} step{pendingApprovals.length > 1 ? "s" : ""} waiting for your approval
          </p>
          <p className="text-xs text-slate-400 mt-1">The agent paused before a sensitive action. Review it in the timeline, then approve or reject.</p>
        </div>
      )}

      {/* Metrics */}
      {showMetrics && execution && (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
          <MetricCard label="Status" value={status} color={status === "completed" ? "text-emerald-400" : status === "failed" ? "text-rose-400" : "text-amber-400"} />
          <MetricCard label="Mode" value={mode} color="text-cyan-400" />
          <MetricCard label="Steps" value={steps.length} color="text-indigo-400" />
          <MetricCard label="Duration" value={fmtMs(execution.duration_ms ?? (steps.length ? stats.span : 0))} color="text-purple-400" />
          <MetricCard label="Tokens" value={stats.tokens ? stats.tokens.toLocaleString() : "—"} color="text-sky-400" />
          <MetricCard label="Cost" value={stats.cost ? `$${stats.cost.toFixed(4)}` : "—"} color="text-emerald-400" />
        </div>
      )}

      {/* Controls */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-xs text-slate-400">
            Mode
            <select value={mode} onChange={(e) => { setMode(e.target.value); localStorage.setItem("mode", e.target.value); }} className="bg-slate-800 text-xs border border-slate-700 text-slate-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:border-cyan-500">
              <option value="fast">Fast</option>
              <option value="accurate">Accurate (guardrails on)</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-xs text-slate-400">
            Status
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="bg-slate-800 text-xs border border-slate-700 text-slate-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:border-cyan-500">
              <option value="all">All</option>
              <option value="running">Running</option>
              <option value="awaiting_approval">Needs approval</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
          </label>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search outputs, tools, errors" className="bg-slate-800 text-xs border border-slate-700 text-slate-200 rounded-md px-3 py-1.5 w-56 focus:outline-none focus:border-cyan-500" />
        </div>
        <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
          <input type="checkbox" checked={showMetrics} onChange={(e) => { setShowMetrics(e.target.checked); localStorage.setItem("showMetrics", String(e.target.checked)); }} className="rounded bg-slate-800 border-slate-700 text-cyan-600 focus:ring-0" />
          Show metrics
        </label>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 mb-6" role="tablist">
        {[["timeline", `Timeline (${filteredSteps.length})`], ["audit", "Audit log"], ["payload", "Input payload"]].map(([k, label]) => (
          <button key={k} role="tab" aria-selected={activeTab === k} onClick={() => setActiveTab(k)} className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-colors ${activeTab === k ? "border-cyan-500 text-cyan-400" : "border-transparent text-slate-400 hover:text-slate-200"}`}>
            {label}
          </button>
        ))}
      </div>

      {activeTab === "timeline" && (
        <div className="space-y-3">
          {filteredSteps.map((step, idx) => {
            const dur = ms(step.started_at, step.finished_at);
            const left = stats.t0 && step.started_at ? ((new Date(step.started_at) - stats.t0) / stats.span) * 100 : 0;
            const width = Math.max(2, ((dur ?? stats.span * 0.02) / stats.span) * 100);
            const open = !!expanded[step.id];
            return (
              <div key={step.id || idx} className={`p-4 rounded-xl border ${step.status === "failed" ? "border-rose-900/50 bg-rose-950/10" : step.status === "awaiting_approval" ? "border-violet-500/40 bg-violet-950/10" : step.status === "completed" ? "border-emerald-900/40 bg-slate-900/40" : "border-slate-800 bg-slate-900/20"}`}>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-bold text-slate-500">{idx + 1}</span>
                    <span className="text-sm font-semibold text-white">{step.step_type || step.name || "Task"}</span>
                    {step.tool && <span className="text-[11px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">{step.tool}</span>}
                    {step.retries > 0 && <span className="text-[11px] text-amber-400">self-healed ×{step.retries}</span>}
                  </div>
                  <div className="flex items-center gap-3 text-[11px] font-mono text-slate-500">
                    <span>{fmtMs(dur)}</span>
                    {step.tokens ? <span>{step.tokens.toLocaleString()} tok</span> : null}
                    <span className={`px-2 py-0.5 rounded border font-bold ${TONE[step.status] || TONE.running}`}>{step.status.replace("_", " ")}</span>
                  </div>
                </div>

                {/* Waterfall bar */}
                <div className="relative h-1.5 bg-slate-800/80 rounded mb-3" aria-hidden>
                  <div className={`absolute h-full rounded ${BAR[step.status] || BAR.running}`} style={{ left: `${Math.min(left, 98)}%`, width: `${Math.min(width, 100 - Math.min(left, 98))}%` }} />
                </div>

                {step.reasoning && (
                  <p className="text-xs text-slate-400 mb-2"><span className="text-slate-500">Why: </span>{step.reasoning}</p>
                )}
                {step.error && <p className="text-xs font-mono text-rose-400 bg-rose-950/30 p-2.5 rounded border border-rose-900/30">{step.error}</p>}
                {step.output && (
                  <div className={`mt-2 bg-slate-950/60 p-3 rounded-lg border border-slate-800/80 font-mono text-xs text-slate-300 overflow-x-auto ${open ? "" : "max-h-24 overflow-y-hidden"}`}>
                    <pre className="whitespace-pre-wrap">{typeof step.output === "object" ? JSON.stringify(step.output, null, 2) : String(step.output)}</pre>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 mt-3">
                  {step.output && <button onClick={() => setExpanded((p) => ({ ...p, [step.id]: !open }))} className="text-[11px] text-slate-400 hover:text-white">{open ? "Collapse output" : "Expand output"}</button>}
                  {step.status === "awaiting_approval" && (
                    <>
                      <button disabled={!!busy} onClick={() => decide(step.id, "approve")} className={`${btn} !py-1 bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400/30`}>Approve</button>
                      <button disabled={!!busy} onClick={() => decide(step.id, "reject")} className={`${btn} !py-1 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border-rose-800/40`}>Reject</button>
                    </>
                  )}
                  {step.status === "failed" && !isLive && (
                    <button disabled={!!busy} onClick={() => retryFrom(step.id)} className={`${btn} !py-1 bg-cyan-600 hover:bg-cyan-500 text-white border-cyan-400/30`}>Retry from this step</button>
                  )}
                </div>
              </div>
            );
          })}
          {filteredSteps.length === 0 && (
            <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl">
              <p className="text-xs text-slate-500">{steps.length ? "No steps match these filters." : "No steps recorded yet. Run the execution to see live telemetry."}</p>
            </div>
          )}
        </div>
      )}

      {activeTab === "audit" && (
        <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead className="text-slate-500 text-left">
              <tr>{["Started", "Step", "Tool", "Status", "Duration", "Cost"].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-300">
              {steps.map((s, i) => (
                <tr key={s.id || i}>
                  <td className="px-4 py-2.5">{s.started_at ? new Date(s.started_at).toLocaleTimeString() : "—"}</td>
                  <td className="px-4 py-2.5">{s.step_type}</td>
                  <td className="px-4 py-2.5">{s.tool || "—"}</td>
                  <td className="px-4 py-2.5">{s.status}</td>
                  <td className="px-4 py-2.5">{fmtMs(ms(s.started_at, s.finished_at))}</td>
                  <td className="px-4 py-2.5">{s.cost_usd ? `$${Number(s.cost_usd).toFixed(4)}` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "payload" && (
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto">
          <pre>{JSON.stringify(execution?.goal_payload || {}, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

export default function ExecutionDetail() {
  return (
    <SubscriptionGuard>
      <ExecutionDetailContent />
    </SubscriptionGuard>
  );
}

function MetricCard({ label, value, color }) {
  return (
    <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800/80">
      <p className="text-[11px] font-mono text-slate-500 mb-1">{label}</p>
      <p className={`text-lg font-mono font-bold ${color}`}>{value || "—"}</p>
    </div>
  );
}
