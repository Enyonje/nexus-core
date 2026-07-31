// src/components/ExecutionDetail.jsx
import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiFetch, safeApiFetch } from "../lib/api";
import { useToast } from "./ToastContext.jsx";
import LoadingSpinner from "./LoadingSpinner.jsx";
import { useAuth } from "../context/AuthProvider.jsx";
import SubscriptionGuard from "./SubscriptionGuard";

function ExecutionDetailContent() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { initializing, subscription } = useAuth();

  const [execution, setExecution] = useState(null);
  const [steps, setSteps] = useState([]);
  const [loading, setLoading] = useState(true);

  // UI State
  const [analysisText, setAnalysisText] = useState("");
  const [mode, setMode] = useState(() => localStorage.getItem("mode") || "fast");
  const [showMetrics, setShowMetrics] = useState(() => localStorage.getItem("showMetrics") !== "false");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showHelp, setShowHelp] = useState(false);
  const [copied, setCopied] = useState(false);

  // Redirect free users to subscription page
  useEffect(() => {
    if (!loading && !initializing && subscription === "free") {
      navigate("/subscription", { replace: true });
    }
  }, [loading, initializing, subscription, navigate]);

  /* =========================
      DATA INITIALIZATION & SSE STREAM
  ========================= */
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

        evtSource = new EventSource(
          `${import.meta.env.VITE_API_URL}/api/executions/${id}/stream?token=${encodeURIComponent(token)}`
        );

        evtSource.onmessage = (e) => {
          try {
            const data = JSON.parse(e.data);

            if (data.event === "execution_progress") {
              setSteps((prev) => {
                const stepId = data.stepId || data.step;
                const normalizedStepId = String(stepId);

                if (prev.find(s => s.id === `${id}-${normalizedStepId}`)) return prev;

                return [
                  ...prev,
                  {
                    ...data,
                    id: `${id}-${normalizedStepId}`,
                    status: data.error ? "failed" : "completed",
                    started_at: new Date().toISOString(),
                  }
                ];
              });
            } else if (["execution_completed", "execution_failed"].includes(data.event)) {
              const status = data.event.split("_")[1];
              setExecution((prev) => ({ ...prev, status }));
              addToast(`Trace ${status}`, status === "failed" ? "error" : "success");
            }
          } catch (err) {
            console.error("Stream parse error", err);
          }
        };

        evtSource.onerror = () => {
          console.warn("SSE connection lost. Reconnecting...");
        };

      } catch (err) {
        addToast("Trace unreachable", "error");
      } finally {
        setLoading(false);
      }
    }

    initTrace();
    return () => evtSource?.close();
  }, [id, initializing, addToast]);

  /* =========================
      HANDLERS
  ========================= */
  const handleRun = async () => {
    if (!execution || !execution.id) {
      addToast("Execution ID missing", "error");
      return;
    }
    try {
      const res = await apiFetch(`/executions/${execution.id}/run`, { method: "POST" });
      addToast("Execution started", "success");
      console.log("Run response:", res);
    } catch (err) {
      addToast("Failed to run execution", "error");
      console.error("Run error:", err);
    }
  };

  const copyTraceId = () => {
    navigator.clipboard.writeText(id).catch(() => addToast("Clipboard copy failed", "error"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    addToast("ID copied to clipboard", "success");
  };

  const exportTraceLogs = () => {
    const logData = { traceId: id, timestamp: new Date().toISOString(), metadata: execution, sequence: steps };
    const blob = new Blob([JSON.stringify(logData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `audit_${id.slice(0, 8)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePurge = async () => {
    if (!window.confirm("CRITICAL: Destroy trace data permanently?")) return;
    try {
      await safeApiFetch(`/executions/${id}`, { method: "DELETE" }, addToast);
      navigate("/executions");
    } catch {
      addToast("Failed to purge trace", "error");
    }
  };

  // Filtered steps based on filterStatus
  const filteredSteps = useMemo(() => {
    if (filterStatus === "all") return steps;
    return steps.filter((s) => s.status === filterStatus);
  }, [steps, filterStatus]);

  if (loading || initializing) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <LoadingSpinner label="Decrypting Audit Stream..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 p-4 md:p-8 relative overflow-hidden font-sans">
      {/* Controls */}
      <div className="space-y-4 mb-6">
        <textarea
          value={analysisText}
          onChange={(e) => setAnalysisText(e.target.value)}
          className="w-full p-2 rounded bg-slate-800 text-slate-200"
          placeholder="Enter analysis text..."
        />

        <select
          value={mode}
          onChange={(e) => {
            setMode(e.target.value);
            localStorage.setItem("mode", e.target.value);
          }}
          className="p-2 rounded bg-slate-800 text-slate-200"
        >
          <option value="fast">Fast</option>
          <option value="accurate">Accurate</option>
        </select>

        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={showMetrics}
            onChange={(e) => {
              setShowMetrics(e.target.checked);
              localStorage.setItem("showMetrics", String(e.target.checked));
            }}
          />
          <span>Show Metrics</span>
        </label>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="p-2 rounded bg-slate-800 text-slate-200"
        >
          <option value="all">All</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
        </select>

        <button
          onClick={() => setShowHelp(!showHelp)}
          className="px-3 py-1 bg-slate-700 rounded text-sm"
        >
          {showHelp ? "Hide Help" : "Show Help"}
        </button>
        {showHelp && (
          <div className="p-2 bg-slate-800 rounded text-xs text-slate-300">
            Use this dashboard to run executions, monitor progress, and export logs.
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="space-x-2 mb-6">
        <button onClick={handleRun} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 transition">
          Run Execution
        </button>
        <button onClick={copyTraceId} className="px-4 py-2 bg-slate-600 text-white rounded hover:bg-slate-500 transition">
          Copy Trace ID
        </button>
        <button onClick={exportTraceLogs} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500 transition">
          Export Logs
        </button>
        <button onClick={handlePurge} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-500 transition">
          Purge Execution
        </button>
      </div>

      {copied && <div className="text-green-400 text-sm mb-4">Trace ID copied!</div>}

      {/* Steps */}
      <div className="space-y-2">
        {filteredSteps.map((step) => (
          <div
            key={step.id}
            className={`p-3 rounded border ${step.status === "failed"
              ? "border-red-500 bg-red-900/30"
              : step.status === "completed"
                ? "border-green-500 bg-green-900/30"
                : "border-slate-500 bg-slate-800/30"
              }`}
          >
            <p className="text-sm font-semibold">
              Step {step.stepId || step.step}: {step.status}
            </p>
            {step.error && (
              <p className="text-xs text-red-400">Error: {step.error}</p>
            )}
            {step.output && (
              <p className="text-xs text-slate-300">Output: {step.output}</p>
            )}
          </div>
        ))}
        {filteredSteps.length === 0 && (
          <p className="text-slate-500 text-sm">No steps to display.</p>
        )}
      </div>

      {/* Metrics */}
      {showMetrics && execution && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <MetricCard label="Status" value={execution.status} color="text-blue-400" />
          <MetricCard label="Mode" value={mode} color="text-purple-400" />
          <MetricCard label="Steps" value={steps.length} color="text-green-400" />
          <MetricCard label="Trace ID" value={id.slice(0, 8)} color="text-yellow-400" />
        </div>
      )}
    </div>
  );
}

// ✅ Wrap with SubscriptionGuard
export default function ExecutionDetail() {
  return (
    <SubscriptionGuard>
      <ExecutionDetailContent />
    </SubscriptionGuard>
  );
}

function MetricCard({ label, value, color }) {
  return (
    <div className="bg-black/20 p-4 rounded-2xl border border-white/5">
      <p className="text-[9px] font-black text-slate-600 uppercase mb-1">{label}</p>
      <p className={`text-xl font-black ${color}`}>{value}</p>
    </div>
  );
}
