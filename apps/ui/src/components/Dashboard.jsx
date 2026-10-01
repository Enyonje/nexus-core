import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { formatDate } from "../lib/utils";
import { useAuth } from "../hooks/useAuth";

export default function Dashboard() {
  const { subscription, user } = useAuth();
  const [executions, setExecutions] = useState([]);
  const [goals, setGoals] = useState([]);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  const isFreeUser = useMemo(() => subscription === "free", [subscription]);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const [healthRes, goalsRes, execsRes] = await Promise.all([
        apiFetch("/health").catch(() => ({ status: "error" })),
        apiFetch("/goals").catch(() => []),
        !isFreeUser ? apiFetch("/executions").catch(() => []) : Promise.resolve([]),
      ]);

      setHealth(healthRes);
      setGoals(Array.isArray(goalsRes) ? goalsRes : []);
      setExecutions(Array.isArray(execsRes) ? execsRes : []);
    } catch (err) {
      console.error("[Dashboard Sync Error]:", err);
    } finally {
      setLoading(false);
    }
  }, [isFreeUser]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const activeExecutionId = useMemo(() => executions[0]?.id || null, [executions]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#020617]">
        <div className="animate-pulse text-cyan-500 font-mono tracking-widest uppercase text-xs">
          Synchronizing Neural Workspace...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 py-12 px-6 relative overflow-hidden font-sans">
      <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-cyan-600/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-6xl mx-auto space-y-10 relative z-10">
        {/* Header Section */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-slate-800/80">
          <div className="space-y-2">
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white">
              Nexus <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">Core</span>
            </h1>
            <div className="flex items-center gap-3">
              <p className="text-slate-400 font-mono font-bold text-[10px] uppercase tracking-widest">
                Clearance Tier: <span className="text-cyan-400">{subscription || "Guest"}</span>
              </p>
              {user?.role === "superadmin" && (
                <Link
                  to="/admin/override"
                  className="text-[10px] font-mono font-bold text-amber-400 hover:text-amber-300 uppercase tracking-wider border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 rounded transition-colors"
                >
                  Admin Panel
                </Link>
              )}
            </div>
          </div>

          <Link
            to="/subscription"
            className="bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-bold uppercase tracking-wider px-6 py-3 rounded-xl transition-all shadow-lg shadow-cyan-900/30 text-center active:scale-95"
          >
            {isFreeUser ? "Upgrade Clearance Tier →" : "Manage Subscription"}
          </Link>
        </header>

        {/* Operational Metrics */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <StatCard
            label="System Integrity"
            value={health?.status === "ok" ? "OPERATIONAL" : "DEGRADED"}
            status={health?.status === "ok" ? "success" : "error"}
          />
          <StatCard label="Active Objectives" value={goals.length} />
          <StatCard
            label="Neural Executions"
            value={isFreeUser ? "RESTRICTED" : executions.length}
            locked={isFreeUser}
          />
        </section>

        {/* Command Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Action Matrix */}
          <section className="lg:col-span-4 flex flex-col gap-4">
            <h2 className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest ml-1">
              Command Matrix
            </h2>
            <ActionCard
              title="Mission Objectives"
              description="Configure and deploy neural autonomous agent goals."
              to="/goals"
              variant="primary"
            />
            <ActionCard
              title="Execution Archive"
              description="Review historical telemetry traces and decision trees."
              to={isFreeUser ? "/subscription" : "/executions"}
              locked={isFreeUser}
            />
            <ActionCard
              title="Real-Time Telemetry Stream"
              description="Monitor live autonomous neural agent execution streams."
              to={activeExecutionId ? `/executions/${activeExecutionId}/stream` : "/executions"}
              locked={isFreeUser}
            />
          </section>

          {/* Activity Feed */}
          <section className="lg:col-span-8 flex flex-col gap-4">
            <div className="flex items-center justify-between ml-1">
              <h2 className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest">
                Recent Execution Traces
              </h2>
              {!isFreeUser && (
                <Link to="/executions" className="text-[10px] font-bold text-cyan-400 hover:underline uppercase tracking-wider">
                  View All Traces
                </Link>
              )}
            </div>

            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-md min-h-[240px]">
              {isFreeUser ? (
                <div className="p-12 text-center flex flex-col items-center justify-center min-h-[240px]">
                  <p className="text-slate-400 text-xs font-mono uppercase tracking-widest mb-4">
                    Telemetry Stream Encrypted under Free Clearance Tier
                  </p>
                  <Link
                    to="/subscription"
                    className="text-cyan-400 text-xs font-bold border border-cyan-500/30 bg-cyan-500/10 px-5 py-2.5 rounded-lg hover:bg-cyan-500/20 transition-all uppercase tracking-wider"
                  >
                    Unlock Full Telemetry Access
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-slate-800/80">
                  {executions.length === 0 ? (
                    <div className="p-12 text-center text-slate-500 text-xs font-mono uppercase tracking-widest">
                      Standby: No Neural Execution Telemetry Recorded
                    </div>
                  ) : (
                    executions.slice(0, 5).map((e) => (
                      <div
                        key={e.id}
                        className="p-4 flex items-center justify-between hover:bg-slate-800/30 transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-2 h-2 rounded-full ${e.status === "running" ? "bg-cyan-400 animate-pulse" : "bg-slate-600"
                              }`}
                          />
                          <div>
                            <p className="text-xs font-bold text-slate-200 group-hover:text-white transition-colors uppercase">
                              {e.goal_type?.replace("_", " ") || "Standard Execution Node"}
                            </p>
                            <p className="text-[10px] font-mono text-slate-500 mt-0.5">
                              {formatDate(e.started_at)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="flex gap-2 text-[10px] font-mono font-bold uppercase">
                            <Link
                              to={`/executions/${e.id}/stream`}
                              className="text-cyan-400 hover:text-cyan-300 transition-colors"
                            >
                              Stream
                            </Link>
                            <span className="text-slate-700">|</span>
                            <Link
                              to={`/executions/${e.id}/audit`}
                              className="text-indigo-400 hover:text-indigo-300 transition-colors"
                            >
                              Audit
                            </Link>
                          </div>
                          <StatusBadge status={e.status} />
                        </div>
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

/* Sub-components */

function StatCard({ label, value, locked, status }) {
  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 relative overflow-hidden shadow-xl min-h-[100px] flex flex-col justify-center">
      {locked && (
        <div className="absolute inset-0 bg-slate-950/90 z-20 flex items-center justify-center backdrop-blur-xs">
          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest border border-slate-800 bg-slate-900/80 px-3 py-1 rounded-md">
            Clearance Upgrade Required
          </span>
        </div>
      )}
      <p className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest mb-1">{label}</p>
      <p
        className={`text-xl font-mono font-bold tracking-tight ${status === "success" ? "text-emerald-400" : status === "error" ? "text-rose-400" : "text-white"
          }`}
      >
        {value}
      </p>
    </div>
  );
}

function ActionCard({ title, description, to, locked, variant }) {
  const isPrimary = variant === "primary";

  if (locked) {
    return (
      <div className="p-5 rounded-xl border border-slate-800/60 bg-slate-900/20 opacity-50 cursor-not-allowed">
        <h3 className="font-bold text-xs uppercase tracking-tight text-slate-500 mb-1">{title}</h3>
        <p className="text-[10px] text-slate-600 leading-relaxed">{description}</p>
      </div>
    );
  }

  return (
    <Link
      to={to}
      className={`block p-5 rounded-xl border transition-all duration-200 shadow-md hover:-translate-y-0.5 ${isPrimary
        ? "bg-cyan-950/20 border-cyan-800/40 hover:bg-cyan-950/40 hover:border-cyan-500/50"
        : "bg-slate-900/40 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40"
        }`}
    >
      <h3 className={`font-bold text-xs uppercase tracking-tight mb-1 ${isPrimary ? "text-cyan-400" : "text-white"}`}>
        {title}
      </h3>
      <p className="text-[10px] text-slate-400 leading-relaxed">{description}</p>
    </Link>
  );
}

function StatusBadge({ status }) {
  const s = status?.toLowerCase();
  const styles = {
    running: "text-cyan-400 border-cyan-500/20 bg-cyan-500/10",
    completed: "text-emerald-400 border-emerald-500/20 bg-emerald-500/10",
    failed: "text-rose-400 border-rose-500/20 bg-rose-500/10",
    pending: "text-amber-400 border-amber-500/20 bg-amber-500/10",
  };

  return (
    <span
      className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border uppercase tracking-wider min-w-[75px] text-center ${styles[s] || "text-slate-400 border-slate-700 bg-slate-800/50"
        }`}
    >
      {status || "unknown"}
    </span>
  );
}