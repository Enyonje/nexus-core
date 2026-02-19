import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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
    <div className="min-h-screen bg-[#020617] flex items-center justify-center">
      <div className="text-blue-500 font-mono tracking-widest animate-pulse uppercase text-xs">
        Fetching Execution History...
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center">
      <div className="text-red-500 border border-red-500/20 bg-red-500/5 px-6 py-4 rounded-2xl font-mono text-xs">
        [SYSTEM_ERR]: {error}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 p-4 md:p-8 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500/20 to-transparent opacity-50" />
      <div className="absolute top-0 left-1/4 w-px h-full bg-white/[0.02]" />
      
      <div className="max-w-6xl mx-auto relative z-10">
        <header className="mb-12 space-y-2">
          <h1 className="text-3xl font-black text-white tracking-tighter uppercase">
            Execution <span className="text-blue-500">Archive</span>
          </h1>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em]">
            Central Node Archive // Trace Logs Enabled
          </p>
        </header>

        {executions.length === 0 ? (
          <div className="bg-slate-900/20 border border-white/5 rounded-3xl p-20 text-center">
            <p className="text-slate-500 font-mono text-xs uppercase italic">No records found in current sector</p>
            <Link to="/goals" className="mt-6 inline-block text-[10px] font-black text-blue-400 uppercase tracking-widest border border-blue-400/20 px-6 py-3 rounded-xl hover:bg-blue-400/10 transition-all">
              Initialize New Goal
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Header Labels (Desktop Only) */}
            <div className="hidden md:grid grid-cols-12 gap-4 px-8 text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2">
              <div className="col-span-3">Trace ID</div>
              <div className="col-span-2 text-center">Protocol Status</div>
              <div className="col-span-3 text-center">Initial Pulse</div>
              <div className="col-span-3 text-center">Completion</div>
              <div className="col-span-1"></div>
            </div>

            {/* List Rows */}
            <div className="space-y-3">
              {executions.map((exec) => (
                <Link
                  key={exec.id || Math.random()}
                  to={`/executions/${exec.id}`}
                  className="group grid grid-cols-1 md:grid-cols-12 items-center gap-4 bg-slate-900/30 hover:bg-slate-800/40 border border-white/5 hover:border-blue-500/30 rounded-2xl p-4 md:p-6 transition-all relative overflow-hidden"
                >
                  {/* Hover Glow Effect */}
                  <div className="absolute left-0 top-0 w-1 h-full bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />

                  <div className="col-span-3 flex items-center gap-4">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                    </div>
                    <span className="font-mono text-sm text-slate-200 group-hover:text-white font-bold">
                      {exec.id ? exec.id.substring(0, 12).toUpperCase() : "NULL_TRACE"}
                    </span>
                  </div>

                  <div className="col-span-2 flex justify-center">
                    <StatusBadge status={exec.status} />
                  </div>

                  <div className="col-span-3 text-center">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter mb-1 md:hidden">Started</p>
                    <span className="text-[11px] font-mono text-slate-400">
                      {exec.started_at ? formatDate(exec.started_at) : "---"}
                    </span>
                  </div>

                  <div className="col-span-3 text-center">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter mb-1 md:hidden">Finished</p>
                    <span className="text-[11px] font-mono text-slate-400">
                      {exec.finished_at ? formatDate(exec.finished_at) : "STILL_ACTIVE"}
                    </span>
                  </div>

                  <div className="col-span-1 flex justify-end">
                    <div className="w-8 h-8 rounded-full border border-white/5 flex items-center justify-center group-hover:border-blue-500/30 group-hover:bg-blue-500/5 transition-all">
                      <span className="text-blue-500 text-xs">→</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const key = status?.toLowerCase();
  
  const styles = {
    running: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    completed: "bg-green-500/10 text-green-400 border-green-500/20",
    failed: "bg-red-500/10 text-red-400 border-red-500/20",
    blocked: "bg-slate-800 text-slate-400 border-slate-700",
  };

  return (
    <span className={`px-3 py-1 rounded-lg border text-[9px] font-black uppercase tracking-widest ${styles[key] || "bg-slate-900 text-slate-500 border-white/5"}`}>
      {status || "UNKNOWN"}
    </span>
  );
}