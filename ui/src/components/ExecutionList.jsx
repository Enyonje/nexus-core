import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch } from "../lib/api";
import { formatDate } from "../lib/utils";
import SubscriptionGuard from "./SubscriptionGuard"; // ✅ import reusable guard

function ExecutionListContent() {
  const [executions, setExecutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadExecutions() {
      try {
        const data = await apiFetch("/executions");
        if (Array.isArray(data)) {
          setExecutions(data);
        } else if (Array.isArray(data.executions)) {
          setExecutions(data.executions);
        } else {
          setExecutions([]);
        }
      } catch (err) {
        setError(err.message || "Archive Access Denied");
      } finally {
        setLoading(false);
      }
    }
    loadExecutions();
  }, []);

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
      {/* ...rest of your JSX unchanged... */}
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
      graceDays={7}   // ✅ allow new users 7 days of access
    >
      <ExecutionListContent />
    </SubscriptionGuard>
  );
}
