import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch } from "../lib/api";
import { formatDate } from "../lib/utils";

export default function ExecutionList() {
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
        <button onClick={() => window.location.reload()} className="text-[10px] font-black text-white uppercase tracking-widest bg-red-500 px-6 py-3 rounded-xl transition-all hover:scale-105">
          Retry Connection
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 p-6 md:p-12 font-sans relative overflow-hidden">
      {/* Visual Depth Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-600/5 blur-[120px] rounded-full" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <header className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-500/20 bg-blue-500/5 text-blue-400 text-[9px] font-black tracking-[0.2em] uppercase">
              <span className="flex h-1.5 w-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]"></span>
              Sentinel Intelligence Monitor
            </div>
            <h1 className="text-5xl md:text-6xl font-black text-white tracking-tighter">
              Active <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">Audits</span>
            </h1>
          </div>
          
          <Link to="/goals" className="group px-8 py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest shadow-[0_0_30px_rgba(37,99,235,0.2)] transition-all hover:scale-[1.02] active:scale-95 flex items-center gap-3">
            Deploy New Swarm
            <span className="group-hover:translate-x-1 transition-transform">→</span>
          </Link>
        </header>

        {executions.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-900/20 border border-white/5 rounded-[3rem] p-24 text-center backdrop-blur-sm"
          >
            <div className="w-16 h-16 bg-slate-800/50 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-white/5">
              <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0a2 2 0 01-2 2H6a2 2 0 01-2-2m16 0l-8 8-8-8" /></svg>
            </div>
            <p className="text-slate-500 font-mono text-xs uppercase tracking-[0.2em] mb-8 italic">Neural Archive Empty in this sector</p>
            <Link to="/goals" className="px-10 py-5 rounded-2xl border border-blue-500/30 text-blue-400 text-[10px] font-black uppercase tracking-widest hover:bg-blue-500/10 transition-all">
              Initiate Primary Protocol
            </Link>
          </motion.div>
        ) : (
          <div className="grid gap-4">
            <AnimatePresence>
              {executions.map((exec, idx) => (
                <motion.div
                  key={exec.id || idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Link
                    to={`/executions/${exec.id}`}
                    className="group flex flex-col md:flex-row items-center justify-between gap-6 p-6 rounded-2xl bg-slate-900/20 border border-white/5 hover:border-blue-500/30 transition-all backdrop-blur-md relative overflow-hidden"
                  >
                    {/* Lateral Accent */}
                    <div className="absolute left-0 top-0 w-1 h-full bg-blue-500 scale-y-0 group-hover:scale-y-100 transition-transform duration-300" />

                    <div className="flex items-center gap-6 w-full md:w-auto">
                      <div className="w-12 h-12 rounded-xl bg-slate-800/50 border border-white/5 flex items-center justify-center group-hover:border-blue-500/20 transition-all">
                        <span className="text-[10px] font-mono text-blue-500 font-black">
                          {idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-sm font-black uppercase tracking-tight text-white group-hover:text-blue-400 transition-colors">
                            {exec.goal ? exec.goal : `Trace_${exec.id?.substring(0, 8).toUpperCase()}`}
                          </h3>
                          <span className="text-[9px] font-mono text-slate-600 bg-white/5 px-2 py-0.5 rounded">
                            {exec.id?.substring(0, 12).toUpperCase()}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">
                          Deployed: {exec.started_at ? formatDate(exec.started_at) : "Pending Pulse"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-8 w-full md:w-auto justify-between border-t md:border-t-0 border-white/5 pt-4 md:pt-0">
                      <div className="hidden lg:block text-right">
                        <p className="text-[9px] font-black text-slate-600 uppercase mb-1 tracking-widest">System Integrity</p>
                        <div className="flex items-center gap-3">
                          <div className="w-32 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: exec.status === 'completed' ? '100%' : exec.status === 'failed' ? '15%' : '65%' }}
                              className={`h-full ${exec.status === 'failed' ? 'bg-red-500' : 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]'}`} 
                            />
                          </div>
                          <span className="text-[10px] font-mono text-slate-400">
                            {exec.status === 'completed' ? '100%' : exec.status === 'failed' ? 'ERR' : 'SYNC'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <StatusBadge status={exec.status} />
                        <div className="w-10 h-10 rounded-full border border-white/5 flex items-center justify-center group-hover:border-blue-500/30 group-hover:bg-blue-500/5 transition-all">
                          <svg className="w-4 h-4 text-slate-600 group-hover:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
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