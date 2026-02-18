import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { formatDate } from "../lib/utils";
import { useAuth } from "../context/AuthProvider";

export default function Dashboard() {
  const { subscription } = useAuth(); // "free" | "pro" | "enterprise"
  const [executions, setExecutions] = useState([]);
  const [goals, setGoals] = useState([]);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch("/health"),
      apiFetch("/goals").catch(() => []),
      subscription !== "free" ? apiFetch("/executions").catch(() => []) : [],
    ])
      .then(([healthRes, goalsRes, execs]) => {
        setHealth(healthRes);
        setGoals(goalsRes || []);
        setExecutions(execs || []);
      })
      .finally(() => setLoading(false));
  }, [subscription]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#020617]">
        <div className="animate-pulse text-blue-500 font-mono tracking-widest uppercase text-sm">
          Synchronizing Neural Workspace...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 py-12 px-6 relative overflow-hidden">
      {/* Dynamic Background Element */}
      <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-blue-600/5 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="max-w-6xl mx-auto space-y-12 relative z-10">
        
        {/* Futuristic Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/5 pb-10">
          <div className="space-y-2">
            <h1 className="text-5xl font-black tracking-tighter text-white">
              Nexus <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">Core</span>
            </h1>
            <p className="text-slate-500 font-bold text-xs uppercase tracking-[0.3em]">
              Security Clearance: <span className="text-blue-400">{subscription}</span>
            </p>
          </div>
          {subscription === "free" && (
            <Link
              to="/subscription"
              className="bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest px-8 py-4 rounded-2xl transition-all shadow-[0_0_20px_rgba(37,99,235,0.2)] active:scale-95"
            >
              Unlock Enterprise Tier →
            </Link>
          )}
        </header>

        {/* System Telemetry (StatCards) */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard 
            label="Neural Health" 
            value={health?.status === "ok" ? "OPERATIONAL" : "DEGRADED"} 
            status={health?.status === "ok" ? "success" : "error"}
          />
          <StatCard label="Active Objectives" value={goals.length} />
          <StatCard
            label="Workflow Executions"
            value={subscription === "free" ? "RESTRICTED" : executions.length}
            locked={subscription === "free"}
          />
        </section>

        {/* Command Matrix (ActionCards) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <section className="lg:col-span-4 grid grid-cols-1 gap-4">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Command Matrix</h3>
            <ActionCard
              title="New Objective"
              description="Define mission parameters for Nexus agents."
              to="/goals"
              variant="primary"
            />
            <ActionCard
              title="Manual Trigger"
              description="Manually initiate autonomous workflows."
              to={subscription === "free" ? "/subscription" : "/executions"}
              locked={subscription === "free"}
            />
            <ActionCard
              title="Nexus Streams"
              description="Monitor real-time agent orchestration."
              to={subscription === "enterprise" ? "/streams" : "/subscription"}
              locked={subscription !== "enterprise"}
            />
          </section>

          {/* Activity Feed (Recent Executions) */}
          <section className="lg:col-span-8 space-y-4">
            <div className="flex items-center justify-between ml-1">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Recent Activity Log</h3>
              {subscription !== "free" && (
                <Link to="/executions" className="text-[10px] font-bold text-blue-400 hover:text-blue-300 transition uppercase tracking-widest">
                  History Archive →
                </Link>
              )}
            </div>

            <div className="bg-slate-900/20 backdrop-blur-md rounded-3xl border border-white/5 overflow-hidden">
              {subscription === "free" ? (
                <div className="p-20 text-center space-y-4">
                  <div className="text-slate-600 text-xs font-mono uppercase">Activity Log Encrypted</div>
                  <Link to="/subscription" className="inline-block text-[10px] font-black text-blue-400 border border-blue-400/20 px-4 py-2 rounded-xl hover:bg-blue-400/10">Upgrade to Decrypt</Link>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {executions.length === 0 ? (
                    <div className="p-10 text-center text-slate-500 text-xs font-mono">NO ACTIVE LOGS FOUND</div>
                  ) : (
                    executions.slice(0, 5).map((e) => (
                      <div key={e.id} className="p-5 flex justify-between items-center hover:bg-white/[0.02] transition-colors group">
                        <div className="flex items-center gap-4">
                          <div className={`w-1.5 h-1.5 rounded-full ${e.status === 'RUNNING' ? 'bg-blue-500 animate-pulse' : 'bg-slate-700'}`} />
                          <div>
                            <p className="text-sm font-bold text-slate-200 group-hover:text-white transition-colors uppercase tracking-tight">
                              {e.goal_type || "Standard Execution"}
                            </p>
                            <p className="text-[10px] font-mono text-slate-500">
                              TIMESTAMP: {formatDate(e.started_at)}
                            </p>
                          </div>
                        </div>
                        <StatusBadge status={e.status} />
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Growth Footer CTA */}
        {subscription !== "enterprise" && (
          <section className="relative group overflow-hidden bg-gradient-to-r from-blue-600/20 to-indigo-600/20 border border-blue-500/20 rounded-3xl p-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="absolute inset-0 bg-blue-600/5 translate-y-full group-hover:translate-y-0 transition-transform duration-700" />
            <div className="relative z-10">
              <h4 className="text-xl font-black text-white tracking-tighter">Ready to Scale Operations?</h4>
              <p className="text-sm text-slate-400 mt-1 max-w-md">
                Unlock advanced orchestration, high-bandwidth streams, and full audit logs for your engineering team.
              </p>
            </div>
            <Link
              to="/subscription"
              className="relative z-10 bg-white text-slate-950 text-[10px] font-black uppercase tracking-widest px-8 py-4 rounded-2xl hover:bg-slate-200 transition-all shadow-xl"
            >
              Elevate Clearances
            </Link>
          </section>
        )}
      </div>
    </div>
  );
}

/* =======================
    Styled Components
======================= */

function StatCard({ label, value, locked, status }) {
  return (
    <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-8 relative overflow-hidden group">
      {locked && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-20 flex items-center justify-center">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest border border-slate-800 px-3 py-1 rounded-lg">Level Locked</span>
        </div>
      )}
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{label}</p>
      <p className={`text-2xl font-black tracking-tighter ${status === 'success' ? 'text-green-400' : status === 'error' ? 'text-red-400' : 'text-white'}`}>
        {value}
      </p>
      <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}

function ActionCard({ title, description, to, locked, variant }) {
  const isPrimary = variant === 'primary';
  return (
    <Link
      to={to}
      className={`group p-6 rounded-2xl border transition-all relative overflow-hidden
        ${isPrimary ? "bg-blue-600/10 border-blue-500/30 hover:bg-blue-600/20" : "bg-slate-900/20 border-white/5 hover:border-blue-500/30"}
        ${locked ? "opacity-50 grayscale cursor-not-allowed" : "active:scale-[0.98]"}
      `}
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className={`font-black text-sm uppercase tracking-tight ${isPrimary ? "text-blue-400" : "text-white"}`}>
          {title}
        </h3>
        {locked && <div className="text-[8px] font-black bg-yellow-500/10 text-yellow-500 px-2 py-0.5 rounded uppercase tracking-tighter">Locked</div>}
      </div>
      <p className="text-xs text-slate-500 leading-relaxed font-medium">
        {description}
      </p>
    </Link>
  );
}

function StatusBadge({ status }) {
  const map = {
    RUNNING: "text-blue-400 bg-blue-400/10 border-blue-400/20",
    COMPLETED: "text-green-400 bg-green-400/10 border-green-400/20",
    FAILED: "text-red-400 bg-red-400/10 border-red-400/20",
  };

  return (
    <span className={`text-[9px] font-black px-3 py-1 rounded-lg border uppercase tracking-widest ${map[status] || "text-slate-500 bg-slate-500/10 border-slate-500/20"}`}>
      {status}
    </span>
  );
}