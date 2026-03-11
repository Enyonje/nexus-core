import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiFetch, safeApiFetch } from "../lib/api";
import { useToast } from "./ToastContext.jsx";
import LoadingSpinner from "./LoadingSpinner.jsx";
import { useAuth } from "../context/AuthProvider.jsx";

// Accessibility helper for ARIA
function ariaLabel(label) {
  return { "aria-label": label };
}

export default function ExecutionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { role, initializing } = useAuth();

  const [execution, setExecution] = useState(null);
  const [steps, setSteps] = useState([]);
  const [loading, setLoading] = useState(true);

  // Neural Parameters
  const [analysisText, setAnalysisText] = useState("");
  const [mode, setMode] = useState(() => localStorage.getItem("mode") || "fast");
  const [showMetrics, setShowMetrics] = useState(() => localStorage.getItem("showMetrics") !== "false");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showHelp, setShowHelp] = useState(false);

  // For analytics/journey mapping
  useEffect(() => {
    if (!loading && execution) {
      // Example: send analytics event
      window.dispatchEvent(new CustomEvent("traceViewed", { detail: { id, user: execution.user_id } }));
    }
  }, [loading, execution, id]);

  /* =========================
      DATA INITIALIZATION & STREAM
  ========================= */
  useEffect(() => {
    if (initializing) return;

    let evtSource = null;

    async function initTrace() {
      try {
        setLoading(true);
        // 1. Fetch historical state
        const res = await apiFetch(`/executions/${id}`);
        setExecution(res);
        setSteps(Array.isArray(res.steps) ? res.steps : []);

        // 2. Setup Real-time Stream
        const token = localStorage.getItem("authToken");
        if (!token) return;

        evtSource = new EventSource(
          `${import.meta.env.VITE_API_URL}/api/executions/${id}/stream?token=${encodeURIComponent(token)}`,
          { withCredentials: true }
        );

        evtSource.onmessage = (e) => {
          try {
            const data = JSON.parse(e.data);
            if (data.event === "execution_progress") {
              setSteps((prev) => {
                const stepId = data.stepId || data.step;
                const normalizedStepId = typeof stepId === "string" ? stepId : String(stepId);
                if (prev.find(s => s.id === normalizedStepId || s.id === `${id}-${normalizedStepId}`)) return prev;
                return [
                  ...prev,
                  {
                    ...data,
                    id: `${id}-${normalizedStepId}`,
                    status: data.error ? "failed" : "completed",
                    started_at: new Date().toISOString(),
                    duration: data.duration || null
                  }
                ];
              });
            } else if (["execution_completed", "execution_failed"].includes(data.event)) {
              setExecution((prev) => ({ ...prev, status: data.event.split('_')[1] }));
            }
          } catch (err) {
            addToast("Stream sync error", "error");
            console.error("Stream sync error", err);
          }
        };
      } catch (err) {
        addToast("Failed to link with Core", "error");
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

  const progressPercent =
    steps.length > 0
      ? Math.round((groupedSteps.completed.length / steps.length) * 100)
      : 0;

  // Filtered steps for personalization
  const filteredSteps = useMemo(() => {
    if (filterStatus === "all") return steps;
    return steps.filter(s => s.status === filterStatus);
  }, [steps, filterStatus]);

  /* =========================
      HANDLERS
  ========================= */
  const exportTraceLogs = () => {
    const logData = {
      traceId: id,
      timestamp: new Date().toISOString(),
      metadata: execution,
      sequence: steps
    };
    const blob = new Blob([JSON.stringify(logData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const safeId = typeof id === "string" ? id : String(id);
    link.download = `trace_${safeId.slice(0, 8)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    addToast("Neural trace exported", "success");
  };

  const handlePurge = async () => {
    // Multi-step confirmation for destructive action
    if (!window.confirm("CRITICAL: Destroy trace data permanently?")) return;
    if (!window.confirm("Are you absolutely sure? This cannot be undone.")) return;
    await safeApiFetch(`/executions/${id}`, { method: "DELETE" }, addToast);
    navigate("/dashboard");
  };

  // Save preferences
  useEffect(() => {
    localStorage.setItem("mode", mode);
    localStorage.setItem("showMetrics", showMetrics);
  }, [mode, showMetrics]);

  if (loading || initializing)
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <LoadingSpinner label="Decrypting Node Trace..." />
      </div>
    );

  const inputStyle =
    "bg-slate-950/60 border border-white/5 text-[11px] text-white px-4 py-2.5 rounded-xl focus:ring-1 focus:ring-blue-500/50 outline-none font-mono";

  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 p-4 md:p-8 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-6xl mx-auto space-y-8 relative z-10">
        {/* Header Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-slate-900/40 backdrop-blur-xl p-6 rounded-[2rem] border border-white/5">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-white/5 rounded-full transition-colors"
              {...ariaLabel("Go Back")}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="space-y-1">
              <h1 className="text-xl font-black text-white tracking-tighter uppercase flex items-center gap-3">
                Trace: {typeof id === "string" ? id.slice(0, 8) : String(id).slice(0, 8)}
                <span
                  className={`text-[9px] px-2 py-0.5 rounded-md border ${
                    execution?.status === "completed"
                      ? "border-green-500/20 text-green-400 bg-green-500/5"
                      : "border-blue-500/20 text-blue-400 animate-pulse"
                  }`}
                  {...ariaLabel("Trace Status")}
                >
                  {execution?.status}
                </span>
              </h1>
              <p className="text-[9px] text-slate-500 font-mono">
                KERNEL_NODE:{" "}
                {typeof execution?.user_id === "string"
                  ? execution.user_id.slice(0, 12)
                  : "SYSTEM"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <input
              type="text"
              value={analysisText}
              onChange={(e) => setAnalysisText(e.target.value)}
              placeholder="Neural Instruction..."
              className={`${inputStyle} w-full md:w-48`}
              {...ariaLabel("Neural Instruction Input")}
            />
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              className={inputStyle}
              {...ariaLabel("Execution Mode")}
            >
              <option value="fast">LIGHTNING</option>
              <option value="deep">DEEP SCAN</option>
            </select>
            <button
              onClick={() => setShowHelp(v => !v)}
              className="p-2 bg-slate-800/50 hover:bg-slate-700 rounded-xl border border-white/5 transition-all"
              title="Help"
              {...ariaLabel("Show Help")}
            >
              ?
            </button>
            <button
              onClick={exportTraceLogs}
              className="p-2.5 bg-slate-800/50 hover:bg-slate-700 rounded-xl border border-white/5 transition-all"
              title="Export JSON"
              {...ariaLabel("Export Trace Logs")}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </button>
            <button
              onClick={() =>
                safeApiFetch(
                  `/executions/${id}/run`,
                  { method: "POST", body: JSON.stringify({ text: analysisText, mode }) },
                  addToast
                )
              }
              className="bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest px-8 py-3 rounded-xl transition-all active:scale-95"
              {...ariaLabel("Execute Trace")}
            >
              Execute
            </button>
            {role === "admin" && (
              <button
                onClick={handlePurge}
                className="bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white text-[10px] font-black uppercase tracking-widest px-5 py-3 rounded-xl transition-all border border-red-500/20"
                {...ariaLabel("Purge Trace")}
              >
                Purge
              </button>
            )}
          </div>
        </div>

        {/* Help/Onboarding */}
        {showHelp && (
          <div className="bg-slate-900/80 text-white rounded-xl p-6 mb-4 border border-blue-500/20 shadow-lg">
            <h2 className="text-lg font-bold mb-2">How to use Trace Detail</h2>
            <ul className="list-disc ml-6 text-sm space-y-1">
              <li>View real-time execution progress and logs.</li>
              <li>Export trace logs for analysis or support.</li>
              <li>Run new neural instructions and select execution mode.</li>
              <li>Admins can purge traces (multi-step confirmation).</li>
              <li>Customize metrics and filter logs for your workflow.</li>
              <li>All actions are accessible via keyboard and screen readers.</li>
            </ul>
            <button
              onClick={() => setShowHelp(false)}
              className="mt-4 px-4 py-2 bg-blue-600 rounded-lg text-white font-bold"
              {...ariaLabel("Close Help")}
            >
              Close
            </button>
          </div>
        )}

        {/* Personalization Controls */}
        <div className="flex items-center gap-4 mb-4">
          <label className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <input
              type="checkbox"
              checked={showMetrics}
              onChange={e => setShowMetrics(e.target.checked)}
              {...ariaLabel("Show Metrics")}
            />
            Show Metrics
          </label>
          <label className="flex items-center gap-2 text-xs font-mono text-slate-400">
            Filter:
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="bg-slate-950/60 border border-white/5 rounded px-2 py-1 text-xs"
              {...ariaLabel("Filter Steps")}
            >
              <option value="all">All</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="running">Running</option>
              <option value="blocked">Blocked</option>
            </select>
          </label>
        </div>

        {/* Metrics Section */}
        {showMetrics && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 bg-slate-900/10 border border-white/5 rounded-[2rem] p-10 backdrop-blur-sm">
              <div className="flex justify-between items-end mb-8">
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                    Throughput Integrity
                  </p>
                  <div className="text-6xl font-black text-white tracking-tighter">
                    {progressPercent}
                    <span className="text-blue-500 text-2xl">%</span>
                  </div>
                </div>
                <div className="text-right text-[10px] font-mono text-slate-500">
                  {groupedSteps.completed.length} / {steps.length} NODES VERIFIED
                </div>
              </div>
              <div className="h-4 w-full bg-slate-950/50 rounded-full overflow-hidden p-1 border border-white/5">
                <div
                  className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 rounded-full transition-all duration-700"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            <div className="bg-slate-900/10 border border-white/5 rounded-[2rem] p-8 flex flex-col justify-center space-y-6">
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-black text-slate-500 uppercase">Failures</span>
                <span className="text-sm font-black text-red-500">{groupedSteps.failed.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-black text-slate-500 uppercase">Latency</span>
                <span className="text-sm font-black text-green-400">14ms</span>
              </div>
            </div>
          </div>
        )}

        {/* Step List */}
        <div className="space-y-4">
          <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] ml-2">
            Sub-Process Logs
          </h2>
          <div className="grid grid-cols-1 gap-3">
            {filteredSteps.length === 0 && (
              <div className="text-center text-xs text-slate-500 py-8">No steps found for this filter.</div>
            )}
            {filteredSteps.map((step) => (
              <div
                key={step.id}
                className="group bg-slate-900/20 hover:bg-slate-900/40 border border-white/5 rounded-2xl p-5 transition-all"
                tabIndex={0}
                {...ariaLabel(`Step ${step.name || "TASK_STREAM"} - ${step.status}`)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-1.5 h-1.5 rounded-full ${
                        step.status === "completed"
                          ? "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]"
                          : step.status === "failed"
                          ? "bg-red-500"
                          : "bg-blue-500 animate-pulse"
                      }`}
                    />
                    <span className="text-[11px] font-black text-white uppercase tracking-tight">
                      {step.name || "TASK_STREAM"}
                    </span>
                  </div>
                  <span className="text-[9px] font-mono text-slate-600 uppercase">{step.status}</span>
                </div>
                <div className="flex items-center gap-2 mt-2 text-xs text-slate-400 font-mono">
                  {step.started_at && (
                    <span>Started: {new Date(step.started_at).toLocaleTimeString()}</span>
                  )}
                  {step.duration && (
                    <span>Duration: {step.duration}ms</span>
                  )}
                </div>
                {step.result && (
                  <div className="mt-4 bg-black/40 rounded-xl p-4 border border-white/5 font-mono">
                    <pre className="text-[10px] text-blue-400/80 whitespace-pre-wrap">
                      {typeof step.result === "string"
                        ? step.result
                        : JSON.stringify(step.result, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/*
ADVANCED USER EXPERIENCE & JOURNEY RECOMMENDATIONS:

1. Error Handling & Feedback:
   - Show clear error messages and retry options for API/stream failures.
   - Use toast notifications for all major actions.

2. Real-Time Progress:
   - Animate progress bar and step transitions.
   - Display timestamps and durations for each step.

3. Accessibility:
   - Add ARIA labels and keyboard navigation for all interactive elements.
   - Ensure color contrast meets accessibility standards.

4. User Guidance:
   - Provide contextual help and onboarding walkthrough (see Help section).
   - Add tooltips for actions like Purge and Export.

5. Performance:
   - Optimize rendering for large step lists (consider virtualization).
   - Debounce input changes for analysis text.

6. Personalization:
   - Allow users to customize metrics visibility and filter steps.
   - Save preferences in local storage.

7. Security:
   - Confirm destructive actions with multi-step dialogs.
   - Mask sensitive data in logs and exports.

8. Mobile Responsiveness:
   - Ensure layout adapts for mobile/tablet screens.

9. Journey Mapping:
   - Track user actions for analytics and improve flow based on usage patterns.
   - Provide feedback after major actions.

10. Integration:
    - Offer links to related traces, executions, or user profile for deeper navigation.

*/