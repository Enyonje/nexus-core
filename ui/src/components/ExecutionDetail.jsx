import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiFetch, safeApiFetch } from "../lib/api";
import { useToast } from "./ToastContext.jsx";
import LoadingSpinner from "./LoadingSpinner.jsx";
import { useAuth } from "../context/AuthProvider.jsx";
import SubscriptionGuard from "./SubscriptionGuard"; // ✅ import guard from its own file

// Accessibility helper for ARIA
function ariaLabel(label) {
  return { "aria-label": label };
}

function ExecutionDetailContent() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { initializing } = useAuth();

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

  /* =========================
      DATA INITIALIZATION & SSE STREAM
  ========================= */
  useEffect(() => {
    if (initializing) return;

    let evtSource = null;

    async function initTrace() {
      try {
        setLoading(true);
        // 1. Initial State Fetch
        const res = await apiFetch(`/executions/${id}`);
        setExecution(res);
        setSteps(Array.isArray(res.steps) ? res.steps : []);

        // 2. Setup Real-time Stream
        const token = localStorage.getItem("authToken");
        if (!token) return;

        // ❌ Removed unsupported { withCredentials: true }
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

                // ✅ Simplified duplicate check
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
              addToast(`Trace ${status}`, status === "failed" ? "error" : "success"); // ✅ correct toast severity
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
      LOGIC & CALCULATIONS
  ========================= */
  const groupedSteps = useMemo(() => {
    return steps.reduce((acc, s) => {
      const status = s.status || "running";
      acc[status] = acc[status] || [];
      acc[status].push(s);
      return acc;
    }, { running: [], completed: [], failed: [], blocked: [] });
  }, [steps]);

  const progressPercent = steps.length > 0
    ? Math.round((groupedSteps.completed.length / steps.length) * 100)
    : 0;

  const filteredSteps = useMemo(() => {
    if (filterStatus === "all") return [...steps].reverse();
    return steps.filter(s => s.status === filterStatus).reverse();
  }, [steps, filterStatus]);

  /* =========================
      HANDLERS
  ========================= */
  const copyTraceId = () => {
    navigator.clipboard.writeText(id).catch(() => addToast("Clipboard copy failed", "error")); // ✅ safer
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
      addToast("Failed to purge trace", "error"); // ✅ better error handling
    }
  };

  if (loading || initializing) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center">
      <LoadingSpinner label="Decrypting Audit Stream..." />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 p-4 md:p-8 relative overflow-hidden font-sans">
      {/* ...rest of your JSX remains unchanged... */}
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
