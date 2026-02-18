import { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { apiFetch, safeApiFetch } from "../lib/api";
import { useToast } from "./ToastContext.jsx";
import LoadingSpinner from "./LoadingSpinner.jsx";
import { useAuth } from "../context/AuthProvider.jsx";

export default function ExecutionDetail({ setSelectedExecutionId }) {
  const { id } = useParams();
  const [execution, setExecution] = useState(null);
  const [steps, setSteps] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();
  const { role } = useAuth();

  const [analysisText, setAnalysisText] = useState("");
  const [threshold, setThreshold] = useState(0.75);
  const [mode, setMode] = useState("fast");

  useEffect(() => {
    async function loadExecution() {
      try {
        const res = await apiFetch(`/api/executions/${id}`);
        setExecution(res);
        setSteps(res.steps || []);
      } catch {
        addToast("Failed to sync with Core", "error");
      } finally {
        setLoading(false);
      }
    }
    loadExecution();

    const token = localStorage.getItem("authToken");
    if (!token) return;

    const evtSource = new EventSource(
      `${import.meta.env.VITE_API_URL}/api/executions/${id}/stream?token=${encodeURIComponent(token)}`,
      { withCredentials: true }
    );

    evtSource.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.event === "execution_progress") {
          setSteps((prev) => [...prev, { ...data, id: `${id}-${data.stepId || data.step}`, status: data.error ? "failed" : "completed", started_at: new Date().toISOString() }]);
        } else if (data.event === "execution_completed" || data.event === "execution_failed") {
          setExecution((prev) => ({ ...prev, status: data.event.split('_')[1] }));
        }
      } catch (err) { console.error("Stream parse error", err); }
    };

    return () => evtSource.close();
  }, [id]);

  const groupedSteps = useMemo(() => {
    return steps.reduce((acc, s) => {
      acc[s.status] = acc[s.status] || [];
      acc[s.status].push(s);
      return acc;
    }, { running: [], completed: [], failed: [], blocked: [] });
  }, [steps]);

  const progressPercent = steps.length > 0 ? Math.round((groupedSteps.completed.length / steps.length) * 100) : 0;

  const inputStyle = "bg-slate-950/40 border-none text-xs text-white px-3 py-2 rounded-lg focus:ring-1 focus:ring-blue-500/50 outline-none transition-all placeholder:text-slate-700";

  if (loading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center"><LoadingSpinner label="Accessing Node..." /></div>;

  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 p-4 md:p-8 font-sans">
      {/* Background Ambience */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-6xl mx-auto space-y-8 relative z-10">
        
        {/* Header & Command Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-slate-900/40 backdrop-blur-xl p-6 rounded-3xl border border-white/5 shadow-2xl">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-black text-white tracking-tighter uppercase">Trace: {id.slice(0,8)}</h1>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-widest ${execution.status === 'completed' ? 'bg-green-500/10 text-green-400' : 'bg-blue-500/10 text-blue-400 animate-pulse'}`}>
                {execution.status}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 font-mono">ENGR_ID: {execution.user_id || 'SYSTEM_PROC'}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <input type="text" value={analysisText} onChange={(e) => setAnalysisText(e.target.value)} placeholder="Neural Prompt..." className={`${inputStyle} w-48`} />
            <select value={mode} onChange={(e) => setMode(e.target.value)} className={inputStyle}>
              <option value="fast">LIGHTNING</option>
              <option value="deep">DEEP SCAN</option>
            </select>
            
            <div className="h-8 w-px bg-white/10 mx-2 hidden md:block" />

            <button onClick={() => safeApiFetch(`/api/executions/${id}/run`, { method: "POST", body: JSON.stringify({ text: analysisText, parameters: { threshold, mode } }) }, addToast)} 
              className="bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest px-6 py-2.5 rounded-xl transition-all shadow-lg shadow-blue-900/20 active:scale-95">
              Execute
            </button>
            
            <button onClick={() => setSelectedExecutionId(execution.id)} className="bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-black uppercase tracking-widest px-4 py-2.5 rounded-xl transition-all">
              Logs
            </button>

            {role === "admin" && (
              <button onClick={() => safeApiFetch(`/api/executions/${id}`, { method: "DELETE" }, addToast)} className="bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white text-[10px] font-black uppercase tracking-widest px-4 py-2.5 rounded-xl transition-all border border-red-500/20">
                Purge
              </button>
            )}
          </div>
        </div>

        {/* Status Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Progress Card */}
          <div className="md:col-span-2 bg-slate-900/20 backdrop-blur-md rounded-3xl p-8 border border-white/5">
            <div className="flex justify-between items-end mb-6">
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Deployment Integrity</h3>
                <div className="text-4xl font-black text-white">{progressPercent}<span className="text-blue-500 text-xl">%</span></div>
              </div>
              <div className="text-right text-[10px] font-mono text-slate-500">
                {groupedSteps.completed.length} / {steps.length} NODES VERIFIED
              </div>
            </div>
            <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden p-0.5">
              <div 
                className="h-full bg-gradient-to-r from-blue-600 to-indigo-400 rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(37,99,235,0.4)]"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Metrics Card */}
          <div className="bg-slate-900/20 backdrop-blur-md rounded-3xl p-8 border border-white/5 flex flex-col justify-center">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Failures</span>
                <span className={`text-xs font-bold ${groupedSteps.failed.length > 0 ? 'text-red-400' : 'text-slate-600'}`}>{groupedSteps.failed.length}</span>
              </div>
              <div className="h-px bg-white/5" />
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Blocked</span>
                <span className="text-xs font-bold text-yellow-500">{groupedSteps.blocked.length}</span>
              </div>
              <div className="h-px bg-white/5" />
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Avg Latency</span>
                <span className="text-xs font-bold text-blue-400">244ms</span>
              </div>
            </div>
          </div>
        </div>

        {/* Step Inspection */}
        <div className="space-y-4">
          <h2 className="text-xs font-black text-slate-500 uppercase tracking-[0.3em] ml-2">Sub-Process Inspection</h2>
          <div className="grid grid-cols-1 gap-4">
            {["running", "completed", "failed"].map((statusGroup) => (
              groupedSteps[statusGroup].map((step) => (
                <div key={step.id} className="group bg-slate-900/40 hover:bg-slate-800/40 border border-white/5 rounded-2xl p-4 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-2 h-2 rounded-full ${statusGroup === 'completed' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : statusGroup === 'failed' ? 'bg-red-500' : 'bg-blue-500 animate-ping'}`} />
                      <span className="text-xs font-bold text-white tracking-wide uppercase">{step.name}</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-600 uppercase">{statusGroup}</span>
                  </div>
                  {step.result && (
                    <div className="mt-4 bg-slate-950/80 rounded-xl p-4 border border-white/5 group-hover:border-blue-500/20 transition-colors">
                      <pre className="text-[10px] text-blue-300 font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap">
                        {JSON.stringify(step.result, null, 2)}
                      </pre>
                    </div>
                  )}
                  {step.error && (
                    <div className="mt-4 bg-red-500/5 rounded-xl p-3 border border-red-500/10">
                      <p className="text-[10px] text-red-400 font-mono italic">ERR: {step.error}</p>
                    </div>
                  )}
                </div>
              ))
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}