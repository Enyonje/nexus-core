import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { formatDate } from "../lib/utils";
import { useAuth } from "../context/AuthProvider";

export default function Dashboard() {
  const { subscription } = useAuth();
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
      {/* Background Glow */}
      <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-blue-600/5 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="max-w-6xl mx-auto space-y-10 relative z-10">
        
        {/* Header Section */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6">
          <div className="space-y-2">
            <h1 className="text-5xl font-black tracking-tighter text-white">
              Nexus <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">Core</span>
            </h1>
            <p className="text-slate-500 font-bold text-[10px] uppercase tracking-[0.3em]">
              Security Clearance: <span className="text-blue-400">{subscription}</span>
            </p>
          </div>
          {subscription === "free" && (
            <Link
              to="/subscription"
              className="bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest px-8 py-3.5 rounded-xl transition-all shadow-lg active:scale-95"
            >
              Upgrade Protocol →
            </Link>
          )}
        </header>

        {/* Top Stats Grid */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
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

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Side: Actions */}
          <section className="lg:col-span-4 flex flex-col gap-4">
            <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Command Matrix</h3>
            <ActionCard
              title="New Objective"
              description="Define mission parameters for Nexus agents."
              to="/goals"
              variant="primary"
            />
            <ActionCard
              title="Manual Trigger"
              description="Initiate autonomous workflows."
              to={subscription === "free" ? "/subscription" : "/executions"}
              locked={subscription === "free"}
            />
            <ActionCard
              title="Nexus Streams"
              description="Real-time orchestration monitor."
              to={subscription === "enterprise" ? "/streams" : "/subscription"}
              locked={subscription !== "enterprise"}
            />
          </section>

          {/* Right Side: Activity Feed */}
          <section className="lg:col-span-8 flex flex-col gap-4">
            <div className="flex items-center justify-between ml-1">
              <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Recent Activity</h3>
              <Link to="/executions" className="text-[10px] font-bold text-blue-500 hover:underline uppercase tracking-widest">
                Full Logs
              </Link>
            </div>

            <div className="bg-slate-900/40 border border-white/5 rounded-2xl overflow-hidden backdrop-blur-sm">
              {subscription === "free" ? (
                <div className="p-16 text-center">
                  <p className="text-slate-500 text-[10px] font-mono uppercase tracking-widest mb-4">Activity Log Encrypted</p>
                  <Link to="/subscription" className="text-blue-400 text-[10px] font-black border border-blue-400/20 px-4 py-2 rounded-lg hover:bg-blue-400/5 transition-all">DECRYPT NOW</Link>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {executions.length === 0 ? (
                    <div className="p-10 text-center text-slate-600 text-xs font-mono">STANDBY: NO ACTIVITY DETECTED</div>
                  ) : (
                    executions.slice(0, 5).map((e) => (
                      <div key={e.id} className="p-4 flex justify-between items-center hover:bg-white/[0.02] transition-colors group">
                        <div className="flex items-center gap-3">
                          <div className={`w-1 h-1 rounded-full ${e.status === 'RUNNING' ? 'bg-blue-500 animate-pulse' : 'bg-slate-600'}`} />
                          <div>
                            <p className="text-xs font-bold text-slate-300 group-hover:text-white transition-colors uppercase">
                              {e.goal_type || "Standard Node"}
                            </p>
                            <p className="text-[9px] font-mono text-slate-500 mt-0.5">
                              {formatDate(e.started_at)}
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
      </div>
    </div>
  );
}

/* UI Helper Components */

function StatCard({ label, value, locked, status }) {
  return (
    <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-6 relative overflow-hidden group shadow-xl">
      {locked && (
        <div className="absolute inset-0 bg-slate-950/90 z-20 flex items-center justify-center">
          <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest border border-slate-800 px-3 py-1 rounded-md">Locked</span>
        </div>
      )}
      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">{label}</p>
      <p className={`text-xl font-black tracking-tighter ${status === 'success' ? 'text-green-400' : status === 'error' ? 'text-red-400' : 'text-white'}`}>
        {value}
      </p>
    </div>
  );
}

function ActionCard({ title, description, to, locked, variant }) {
  const isPrimary = variant === 'primary';
  return (
    <Link to={to} className={`block p-5 rounded-xl border transition-all ${isPrimary ? "bg-blue-600/10 border-blue-500/20 hover:bg-blue-600/20" : "bg-slate-900/40 border-white/5 hover:border-blue-500/20"} ${locked ? "opacity-40 grayscale pointer-events-none" : "hover:-translate-y-1 shadow-lg"}`}>
      <h3 className={`font-black text-xs uppercase tracking-tight mb-1 ${isPrimary ? "text-blue-400" : "text-white"}`}>{title}</h3>
      <p className="text-[10px] text-slate-500 leading-relaxed">{description}</p>
    </Link>
  );
}

function StatusBadge({ status }) {
  const styles = {
    RUNNING: "text-blue-400 border-blue-400/20 bg-blue-400/5",
    COMPLETED: "text-green-400 border-green-400/20 bg-green-400/5",
    FAILED: "text-red-400 border-red-400/20 bg-red-400/5",
  };
  return (
    <span className={`text-[8px] font-black px-2 py-0.5 rounded border uppercase tracking-widest ${styles[status] || "text-slate-500 border-white/10"}`}>
      {status}
    </span>
  );
}