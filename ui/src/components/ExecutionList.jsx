// ...existing code...
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch } from "../lib/api";
import { formatDate } from "../lib/utils";
import SubscriptionGuard from "./SubscriptionGuard"; // ✅ import reusable guard
import { useToast } from "./ToastContext.jsx";

function ExecutionListContent() {
  const [executions, setExecutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [runningId, setRunningId] = useState(null);
  const navigate = useNavigate();
  const { addToast } = useToast();

  useEffect(() => {
    let mounted = true;
    async function loadExecutions() {
      try {
        const data = await apiFetch("/executions");

        // backend may return { requiresSubscription, executions, user } or an array
        if (data?.requiresSubscription) {
          navigate("/upgrade", { replace: true });
          return;
        }

        if (Array.isArray(data)) {
          if (!mounted) return;
          setExecutions(data);
        } else if (Array.isArray(data.executions)) {
          if (!mounted) return;
          setExecutions(data.executions);
        } else {
          if (!mounted) return;
          setExecutions([]);
        }
      } catch (err) {
        setError(err?.message || "Archive Access Denied");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadExecutions();
    return () => { mounted = false; };
  }, [navigate]);

  const runExecution = async (execution) => {
    // derive id from possible shapes returned by backend
    const execId = execution?.id || execution?.execution?.id || null;
    if (!execId) {
      addToast("Execution ID missing — cannot run", "error");
      console.error("Attempted to run execution with no id:", execution);
      return;
    }

    setRunningId(execId);
    try {
      const res = await apiFetch(`/executions/${encodeURIComponent(execId)}/run`, {
        method: "POST",
        body: {},
      });
      console.log("Execution started:", res);
      addToast("Execution started", "success");
    } catch (err) {
      console.error("Run failed:", err);
      addToast("Failed to start execution", "error");
    } finally {
      setRunningId(null);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center">
      <div className="relative w-16 h-16 mb-4">
        <div className="absolute inset-0 border-2 border-blue-500/20 rounded-full"></div>
        <div className="absolute inset-0 border-t-2 border-blue-500 rounded-full animate-spin"></div>
      </div>
      <div className="text-blue-500 font-black tracking-[0.3em] uppercase text-[10px]">
        Syncing with Central Node...
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-red-500/5 border border-red-500/20 p-8 rounded-[2rem] text-center">
        <div className="text-red-500 font-mono text-xs mb-4 uppercase tracking-widest">[SYSTEM_ERR]</div>
        <p className="text-slate-400 text-sm mb-6">{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="text-[10px] font-black text-white uppercase tracking-widest bg-red-500 px-6 py-3 rounded-xl transition-all hover:scale-105"
        >
          Retry Connection
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 p-6 md:p-12 font-sans relative overflow-hidden">
      <h2 className="text-xl font-bold mb-4">Executions</h2>
      <ul className="space-y-4">
        {executions.map((exec) => (
          <li key={exec.id || exec.execution?.id || Math.random()} className="flex items-center justify-between bg-slate-800 p-4 rounded-lg">
            <div>
              <div className="font-semibold">{exec.goal_type ?? exec.execution?.goal_type ?? "Execution"}</div>
              <div className="text-xs text-slate-400">{formatDate(exec.started_at ?? exec.execution?.started_at)}</div>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={exec.status ?? exec.execution?.status} />
              <button
                onClick={() => runExecution(exec)}
                disabled={runningId === (exec.id || exec.execution?.id) || !(exec.id || exec.execution?.id)}
                className="px-3 py-1 text-xs font-bold uppercase tracking-widest bg-blue-600 text-white rounded hover:bg-blue-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
                title={!(exec.id || exec.execution?.id) ? "Execution id missing" : "Run execution"}
              >
                {runningId === (exec.id || exec.execution?.id) ? "Running..." : "Run"}
              </button>
              <Link to={`/executions/${exec.id ?? exec.execution?.id}`} className="text-xs font-bold uppercase tracking-widest text-slate-300/80">
                View
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StatusBadge({ status }) {
  const key = status?.toLowerCase();
  
  const styles = {
    running: "border-blue-500/20 text-blue-400 bg-blue-500/5 animate-pulse",
    completed: "border-green-500/20 text-green-400 bg-green-500/5",
    failed: "border-red-500/20 text-red-500 bg-red-500/5",
    blocked: "border-slate-700 text-slate-500 bg-slate-800/50",
  };

  return (
    <span className={`px-4 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-widest transition-all ${styles[key] || "border-white/5 text-slate-500"}`}>
      {status || "IDLE"}
    </span>
  );
}

// ✅ Wrap with SubscriptionGuard and enable 7-day grace period
export default function ExecutionList() {
  return (
    <SubscriptionGuard 
      required={["pro", "enterprise"]} 
      message="Pro or Enterprise subscription required" 
      redirectTo="/upgrade"
      graceDays={7}
    >
      <ExecutionListContent />
    </SubscriptionGuard>
  );
}