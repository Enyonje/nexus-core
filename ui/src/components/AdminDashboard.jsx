import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { useAuth } from "../context/AuthProvider";
import { formatDate } from "../lib/utils";

export default function AdminDashboard() {
  const { role, initializing } = useAuth();
  const [usage, setUsage] = useState(null);
  const [executions, setExecutions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 🛡️ GUARD: Only fetch if auth is resolved and user is admin
    if (initializing) return;
    if (role !== "admin") return;

    async function loadAdminData() {
      try {
        const [usageRes, execRes] = await Promise.all([
          apiFetch("/admin/usage"),
          apiFetch("/admin/executions"),
        ]);

        setUsage(usageRes);
        setExecutions(execRes.executions || []);
      } catch (err) {
        console.error("Master override failed:", err.message);
      } finally {
        setLoading(false);
      }
    }
    loadAdminData();
  }, [role, initializing]);

  if (initializing) return <LoadingState message="Verifying Admin Credentials..." />;
  if (role !== "admin") return <Navigate to="/dashboard" replace />;
  if (loading) return <LoadingState message="Decrypting Global Usage Data..." />;

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-12">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/5 pb-10">
          <div>
            <h1 className="text-5xl font-black tracking-tighter text-white uppercase">
              Omniscient <span className="text-red-500">View</span>
            </h1>
            <p className="text-slate-500 font-bold text-[10px] uppercase tracking-[0.3em] mt-2">
              System Administrator: <span className="text-red-400">Level 0 clearance</span>
            </p>
          </div>
          <div className="flex gap-4">
            <div className="bg-slate-900 border border-white/5 px-6 py-3 rounded-2xl">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Global Status</p>
              <p className="text-green-400 text-sm font-bold uppercase tracking-tight">System Optimal</p>
            </div>
          </div>
        </header>

        {/* Usage Overview Table */}
        {usage && usage.users && (
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Usage Metrics — {usage.month}</h2>
              <span className="text-[10px] font-mono text-slate-600 bg-white/5 px-3 py-1 rounded-full border border-white/5">
                {usage.users.length} Total Intelligence Units
              </span>
            </div>
            
            <div className="bg-slate-900/40 border border-white/5 rounded-3xl overflow-hidden backdrop-blur-md">
              <table className="w-full text-left border-collapse">
                <thead className="bg-white/[0.02] border-b border-white/5">
                  <tr>
                    <th className="p-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Node Identifier</th>
                    <th className="p-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Clearance</th>
                    <th className="p-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">AI Consumption</th>
                    <th className="p-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Ops Count</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {usage.users.map((u) => (
                    <tr key={u.id} className="hover:bg-white/[0.01] transition-colors group">
                      <td className="p-5">
                        <p className="text-sm font-bold text-slate-200">{u.email}</p>
                        {/* 🛡️ FIX: String conversion for safe slicing */}
                        <p className="text-[9px] font-mono text-slate-600 mt-1 uppercase tracking-tighter">
                          ID: {String(u.id || "").slice(0, 8)}
                        </p>
                      </td>
                      <td className="p-5">
                        <span className={`text-[9px] font-black px-3 py-1 rounded-lg border uppercase tracking-widest ${u.subscription === 'enterprise' ? 'border-purple-500/30 text-purple-400 bg-purple-500/5' : 'border-white/10 text-slate-400'}`}>
                          {u.subscription}
                        </span>
                      </td>
                      <td className="p-5 font-mono text-xs text-blue-400">
                        {u.ai_used} <span className="text-slate-600">Tokens</span>
                      </td>
                      <td className="p-5 text-right font-black text-white">{u.executions}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* All Executions Feed */}
        <section className="space-y-6">
          <h2 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Global Execution Monitor</h2>
          <div className="grid grid-cols-1 gap-4">
            {executions.length === 0 ? (
              <div className="p-20 text-center border border-dashed border-white/10 rounded-3xl">
                <p className="text-slate-600 text-xs font-mono uppercase">No active swarm logs found</p>
              </div>
            ) : (
              executions.map((e) => (
                <div key={e.id} className="bg-slate-900/40 border border-white/5 p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between hover:border-red-500/30 transition-all group">
                  <div className="flex items-center gap-6">
                    <div className={`w-2 h-2 rounded-full ${e.status === 'RUNNING' ? 'bg-blue-500 animate-pulse' : 'bg-slate-700'}`} />
                    <div>
                      {/* 🛡️ FIX: String conversion for safe slicing */}
                      <h4 className="text-sm font-black text-white tracking-tight uppercase">
                        NODE_{String(e.id || "").slice(0, 8)}
                      </h4>
                      <p className="text-[10px] font-mono text-slate-500 mt-1 uppercase">
                        INIT: {formatDate(e.started_at)} {e.finished_at && `// TERM: ${formatDate(e.finished_at)}`}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6 mt-4 md:mt-0 w-full md:w-auto">
                    <StatusBadge status={e.status} />
                    <Link
                      to={`/executions/${e.id}`}
                      className="px-6 py-2.5 rounded-xl bg-white text-slate-950 text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                    >
                      Audit
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

/* Internal Components */

function LoadingState({ message }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#020617]">
      <div className="text-center space-y-4">
        <div className="w-12 h-12 border-2 border-red-500/20 border-t-red-500 rounded-full animate-spin mx-auto" />
        <p className="animate-pulse text-red-500 font-mono tracking-widest uppercase text-xs">
          {message}
        </p>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    RUNNING: "text-blue-400 bg-blue-400/10 border-blue-400/20",
    COMPLETED: "text-green-400 bg-green-400/10 border-green-400/20",
    FAILED: "text-red-400 bg-red-400/10 border-red-400/20",
  };
  return (
    <span className={`text-[9px] font-black px-3 py-1 rounded-lg border uppercase tracking-widest ${map[status] || "text-slate-500"}`}>
      {status}
    </span>
  );
}