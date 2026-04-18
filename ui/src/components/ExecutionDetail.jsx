import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
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
                
                // Prevent duplicate entries
                if (prev.find(s => s.id === normalizedStepId || s.id === `${id}-${normalizedStepId}`)) return prev;
                
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
              setExecution((prev) => ({ ...prev, status: data.event.split('_')[1] }));
              addToast(`Trace ${data.event.split('_')[1]}`, "success");
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
        // Optional: Redirect to executions list if the trace doesn't exist
        // navigate("/executions");
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
    if (filterStatus === "all") return [...steps].reverse(); // Show latest logs first
    return steps.filter(s => s.status === filterStatus).reverse();
  }, [steps, filterStatus]);

  /* =========================
      HANDLERS
  ========================= */
  const copyTraceId = () => {
    navigator.clipboard.writeText(id);
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
    await safeApiFetch(`/executions/${id}`, { method: "DELETE" }, addToast);
    navigate("/executions");
  };

  if (loading || initializing) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center">
      <LoadingSpinner label="Decrypting Audit Stream..." />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 p-4 md:p-8 relative overflow-hidden font-sans">
      {/* Background Ambience */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-purple-600/5 blur-[100px] rounded-full pointer-events-none" />

      <div className="max-w-6xl mx-auto space-y-6 relative z-10">
        
        {/* ACTION HEADER */}
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-slate-900/40 backdrop-blur-xl p-6 rounded-[2rem] border border-white/5 shadow-2xl">
          <div className="flex items-center gap-5">
            <Link to="/executions" className="p-3 bg-slate-800/50 hover:bg-slate-700 rounded-2xl border border-white/5 transition-all group">
              <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-black text-white tracking-tighter uppercase">Audit Stream</h1>
                <span className={`text-[10px] px-2 py-0.5 rounded-md border font-bold ${
                  execution?.status === "completed" ? "border-green-500/20 text-green-400 bg-green-500/5" : "border-blue-500/20 text-blue-400 animate-pulse bg-blue-500/5"
                }`}>
                  {execution?.status?.toUpperCase()}
                </span>
              </div>
              <div className="flex items-center gap-2 font-mono text-[10px] text-slate-500">
                <span className="uppercase tracking-widest">Trace ID:</span>
                <span className="text-slate-300">{id}</span>
                <button 
                  onClick={copyTraceId}
                  className={`ml-2 px-2 py-0.5 rounded border transition-all ${copied ? 'border-green-500 text-green-500' : 'border-slate-700 hover:text-white'}`}
                >
                  {copied ? 'COPIED' : 'COPY'}
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative group">
               <input
                type="text"
                value={analysisText}
                onChange={(e) => setAnalysisText(e.target.value)}
                placeholder="Direct neural command..."
                className="bg-slate-950/60 border border-white/5 text-[11px] text-white px-4 py-3 rounded-xl focus:ring-1 focus:ring-blue-500/50 outline-none font-mono w-full md:w-64"
              />
            </div>
            
            <button
              onClick={exportTraceLogs}
              className="p-3 bg-slate-800/50 hover:bg-slate-700 rounded-xl border border-white/5 transition-all text-slate-400 hover:text-white"
              title="Export JSON"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </button>

            <button
              onClick={() => safeApiFetch(`/executions/${id}/run`, { method: "POST", body: JSON.stringify({ text: analysisText, mode }) }, addToast)}
              className="bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest px-8 py-3.5 rounded-xl transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] active:scale-95"
            >
              Execute
            </button>

            {role === "admin" && (
              <button onClick={handlePurge} className="bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white text-[10px] font-black uppercase tracking-widest px-5 py-3.5 rounded-xl transition-all border border-red-500/20">
                Purge
              </button>
            )}
          </div>
        </header>

        {/* METRICS & LOGS GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT: System Health */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-slate-900/20 border border-white/5 rounded-[2rem] p-8 backdrop-blur-sm">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-6">Integrity Metrics</h3>
              <div className="space-y-8">
                <div>
                  <div className="flex justify-between items-end mb-3">
                    <span className="text-4xl font-black text-white">{progressPercent}%</span>
                    <span className="text-[9px] font-mono text-slate-500 mb-2 uppercase">{groupedSteps.completed.length} / {steps.length} Nodes</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 shadow-[0_0_10px_rgba(59,130,246,0.5)] transition-all duration-1000" 
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <MetricCard label="Latency" value="14ms" color="text-green-400" />
                  <MetricCard label="Errors" value={groupedSteps.failed.length} color="text-red-500" />
                </div>
              </div>
            </div>

            <div className="p-6 bg-blue-600/5 border border-blue-500/10 rounded-3xl">
              <p className="text-[10px] text-blue-400/80 font-mono leading-relaxed">
                System is monitoring Aiven PostgreSQL stream. Logs are being synchronized with the Nairobi Central Node.
              </p>
            </div>
          </div>

          {/* RIGHT: Console Logs */}
          <div className="lg:col-span-8">
            <div className="bg-black/40 border border-white/5 rounded-[2rem] flex flex-col h-[600px] shadow-inner overflow-hidden">
              <div className="px-8 py-4 border-b border-white/5 flex justify-between items-center bg-slate-900/20">
                <div className="flex items-center gap-6">
                  <span className="text-[10px] font-black text-white uppercase tracking-widest">Process Output</span>
                  <select
                    value={filterStatus}
                    onChange={e => setFilterStatus(e.target.value)}
                    className="bg-transparent border-none text-[9px] font-bold text-slate-500 uppercase tracking-widest outline-none cursor-pointer hover:text-blue-400"
                  >
                    <option value="all">View All Logs</option>
                    <option value="completed">Success Only</option>
                    <option value="failed">Errors Only</option>
                  </select>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-8 font-mono text-[11px] space-y-4 custom-scrollbar">
                {filteredSteps.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-2 opacity-50">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    <p className="uppercase tracking-tighter">No trace entries detected</p>
                  </div>
                ) : (
                  filteredSteps.map((step) => (
                    <div key={step.id} className="group border-l-2 border-white/5 pl-6 py-2 hover:border-blue-500/50 transition-all">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-[9px] font-black uppercase tracking-widest ${
                          step.status === 'completed' ? 'text-green-500' : step.status === 'failed' ? 'text-red-500' : 'text-blue-400'
                        }`}>
                          {step.name || 'Task_Node'} • {step.status}
                        </span>
                        <span className="text-[9px] text-slate-700">
                          {step.started_at ? new Date(step.started_at).toLocaleTimeString() : '--:--'}
                        </span>
                      </div>
                      <div className="bg-slate-900/40 rounded-xl p-4 border border-white/5 text-slate-400 group-hover:text-slate-200 transition-colors">
                        {typeof step.result === 'string' ? step.result : JSON.stringify(step.result, null, 2)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
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