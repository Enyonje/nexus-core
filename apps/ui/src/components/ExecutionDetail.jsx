// src/components/ExecutionDetail.jsx
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiFetch, safeApiFetch } from "../lib/api";
import { useToast } from "./ToastContext.jsx";
import LoadingSpinner from "./LoadingSpinner.jsx";
import AuthProvider from "../context/AuthProvider.jsx";
import SubscriptionGuard from "./SubscriptionGuard";

function ExecutionDetailContent() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { initializing } = AuthProvider();

  const [execution, setExecution] = useState(null);
  const [steps, setSteps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState("disconnected"); // 'connected' | 'reconnecting' | 'disconnected'

  // UI State
  const [mode, setMode] = useState(() => localStorage.getItem("mode") || "fast");
  const [showMetrics, setShowMetrics] = useState(() => localStorage.getItem("showMetrics") !== "false");
  const [filterStatus, setFilterStatus] = useState("all");
  const [activeTab, setActiveTab] = useState("timeline"); // 'timeline' | 'payload' | 'audit'
  const [copied, setCopied] = useState(false);

  /* =========================================================
     Data Initialization & Resilient SSE Streaming
  ========================================================= */
  useEffect(() => {
    if (initializing) return;

    let evtSource = null;

    async function initTrace() {
      try {
        setLoading(true);
        const res = await apiFetch(`/executions/${id}`);
        setExecution(res);
        setSteps(Array.isArray(res.steps) ? res.steps : []);

        const token = localStorage.getItem("token") || localStorage.getItem("authToken");
        if (!token) return;

        const sseUrl = `${import.meta.env.VITE_API_URL}/api/executions/${id}/stream?token=${encodeURIComponent(token)}`;
        evtSource = new EventSource(sseUrl);

        evtSource.onopen = () => setConnectionStatus("connected");

        evtSource.onmessage = (e) => {
          try {
            const data = JSON.parse(e.data);

            // Handle granular step updates and progress streaming
            if (["execution_step_started", "execution_step_progress", "execution_step_completed", "execution_step_failed"].includes(data.event)) {
              setSteps((prevSteps) => {
                const targetStepId = String(data.stepId || data.step);
                const existingIndex = prevSteps.findIndex((s) => String(s.id) === targetStepId || String(s.stepId) === targetStepId);

                const updatedStep = {
                  id: targetStepId,
                  stepId: targetStepId,
                  step_type: data.stepType || "task",
                  status: data.event === "execution_step_failed" ? "failed" : data.event === "execution_step_completed" ? "completed" : "running",
                  output: data.output || data.partial || null,
                  error: data.error || null,
                  finished_at: ["execution_step_completed", "execution_step_failed"].includes(data.event) ? new Date().toISOString() : null,
                };

                if (existingIndex >= 0) {
                  const updated = [...prevSteps];
                  updated[existingIndex] = { ...updated[existingIndex], ...updatedStep };
                  return updated;
                }

                return [...prevSteps, updatedStep];
              });
            } else if (["execution_completed", "execution_failed", "execution_blocked"].includes(data.event)) {
              const status = data.event.split("_")[1];
              setExecution((prev) => (prev ? { ...prev, status } : null));
              addToast(`Execution trace ${status}`, status === "failed" ? "error" : "success");
            }
          } catch (err) {
            console.error("[SSE Parse Error]", err);
          }
        };

        evtSource.onerror = () => {
          setConnectionStatus("reconnecting");
        };
      } catch (err) {
        addToast("Execution trace unreachable", "error");
      } finally {
        setLoading(false);
      }
    }

    initTrace();

    return () => {
      if (evtSource) {
        evtSource.close();
        setConnectionStatus("disconnected");
      }
    };
  }, [id, initializing, addToast]);

  /* =========================================================
     Handlers
  ========================================================= */
  const handleRun = useCallback(async () => {
    if (!execution?.id) return;
    try {
      await apiFetch(`/executions/${execution.id}/run`, { method: "POST" });
      addToast("Execution dispatched to worker engine", "success");
    } catch (err) {
      addToast("Failed to trigger execution", "error");
    }
  }, [execution, addToast]);

  const copyTraceId = useCallback(() => {
    navigator.clipboard.writeText(id).catch(() => addToast("Clipboard failed", "error"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    addToast("Trace ID copied", "success");
  }, [id, addToast]);

  const exportTraceLogs = useCallback(() => {
    const logData = { traceId: id, timestamp: new Date().toISOString(), metadata: execution, steps };
    const blob = new Blob([JSON.stringify(logData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `nexus_audit_${id.slice(0, 8)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [id, execution, steps]);

  const handlePurge = useCallback(async () => {
    if (!window.confirm("CRITICAL WARNING: Permanently purge execution trace data?")) return;
    try {
      await safeApiFetch(`/executions/${id}`, { method: "DELETE" }, addToast);
      navigate("/executions");
    } catch {
      addToast("Failed to purge execution trace", "error");
    }
  }, [id, addToast, navigate]);

  const filteredSteps = useMemo(() => {
    if (filterStatus === "all") return steps;
    return steps.filter((s) => s.status === filterStatus);
  }, [steps, filterStatus]);

  if (loading || initializing) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <LoadingSpinner label="Decrypting Audit Telemetry Stream..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 p-4 md:p-8 font-sans selection:bg-cyan-500 selection:text-black">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-6 mb-6 gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold tracking-tight text-white">Execution Trace</h1>
            <span className="text-xs font-mono bg-slate-800 text-slate-400 px-2.5 py-1 rounded-md border border-slate-700">
              {id}
            </span>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider ${connectionStatus === "connected"
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                }`}
            >
              ● {connectionStatus}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Real-time step telemetry stream & security compliance evaluation.</p>
        </div>

        {/* Global Action Toolbar */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleRun}
            className="px-3.5 py-2 text-xs font-medium bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors border border-cyan-400/30 shadow-lg shadow-cyan-900/20"
          >
            Trigger Execution
          </button>
          <button
            onClick={copyTraceId}
            className="px-3.5 py-2 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition-colors"
          >
            {copied ? "Copied!" : "Copy Trace ID"}
          </button>
          <button
            onClick={exportTraceLogs}
            className="px-3.5 py-2 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition-colors"
          >
            Export Audit Logs
          </button>
          <button
            onClick={handlePurge}
            className="px-3.5 py-2 text-xs font-medium bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 rounded-lg border border-rose-800/40 transition-colors"
          >
            Purge
          </button>
        </div>
      </div>

      {/* Overview Metrics Grid */}
      {showMetrics && execution && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <MetricCard label="Status" value={execution.status} color={execution.status === "completed" ? "text-emerald-400" : execution.status === "failed" ? "text-rose-400" : "text-amber-400"} />
          <MetricCard label="Engine Mode" value={mode.toUpperCase()} color="text-cyan-400" />
          <MetricCard label="Total Steps" value={steps.length} color="text-indigo-400" />
          <MetricCard label="Duration" value={`${execution.duration_ms || 0} ms`} color="text-purple-400" />
        </div>
      )}

      {/* Control Configuration Bar */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-medium text-slate-400">Mode:</span>
            <select
              value={mode}
              onChange={(e) => {
                setMode(e.target.value);
                localStorage.setItem("mode", e.target.value);
              }}
              className="bg-slate-800 text-xs border border-slate-700 text-slate-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:border-cyan-500"
            >
              <option value="fast">Fast Execution</option>
              <option value="accurate">Accurate (Sentinel Guard)</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-medium text-slate-400">Filter Steps:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-slate-800 text-xs border border-slate-700 text-slate-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:border-cyan-500"
            >
              <option value="all">All Steps</option>
              <option value="running">Running</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>

        <label className="flex items-center space-x-2 text-xs text-slate-400 cursor-pointer">
          <input
            type="checkbox"
            checked={showMetrics}
            onChange={(e) => {
              setShowMetrics(e.target.checked);
              localStorage.setItem("showMetrics", String(e.target.checked));
            }}
            className="rounded bg-slate-800 border-slate-700 text-cyan-600 focus:ring-0"
          />
          <span>Show Metrics Cards</span>
        </label>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-800 mb-6">
        <button
          onClick={() => setActiveTab("timeline")}
          className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-colors ${activeTab === "timeline" ? "border-cyan-500 text-cyan-400" : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
        >
          Step Execution Timeline ({filteredSteps.length})
        </button>
        <button
          onClick={() => setActiveTab("payload")}
          className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-colors ${activeTab === "payload" ? "border-cyan-500 text-cyan-400" : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
        >
          Input Payload Metadata
        </button>
      </div>

      {/* Content Panels */}
      {activeTab === "timeline" && (
        <div className="space-y-3">
          {filteredSteps.map((step, idx) => (
            <div
              key={step.id || idx}
              className={`p-4 rounded-xl border transition-all ${step.status === "failed"
                ? "border-rose-900/50 bg-rose-950/10"
                : step.status === "completed"
                  ? "border-emerald-900/40 bg-slate-900/40"
                  : "border-slate-800 bg-slate-900/20"
                }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                  <span className="text-xs font-mono font-bold text-slate-400">#{idx + 1}</span>
                  <span className="text-sm font-semibold text-white">{step.step_type || step.name || "Task"}</span>
                </div>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase font-bold ${step.status === "completed"
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : step.status === "failed"
                      ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                      : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    }`}
                >
                  {step.status}
                </span>
              </div>

              {step.error && <p className="text-xs font-mono text-rose-400 mt-2 bg-rose-950/30 p-2.5 rounded border border-rose-900/30">{step.error}</p>}

              {step.output && (
                <div className="mt-2 bg-slate-950/60 p-3 rounded-lg border border-slate-800/80 font-mono text-xs text-slate-300 overflow-x-auto">
                  {typeof step.output === "object" ? JSON.stringify(step.output, null, 2) : String(step.output)}
                </div>
              )}
            </div>
          ))}

          {filteredSteps.length === 0 && (
            <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl">
              <p className="text-xs text-slate-500">No step telemetry recorded for this execution trace.</p>
            </div>
          )}
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
      <p className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-lg font-mono font-bold ${color}`}>{value || "—"}</p>
    </div>
  );
}