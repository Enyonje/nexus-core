import React, { useState, useEffect, useCallback } from "react";
import RevenueChart from "../components/RevenueChart";
import AIImpact from "../components/AIImpact";
import { useAgentStream } from "../hooks/useAgentStream";
import { API_ENDPOINTS } from "../config/paths";

import {
  Sparkles,
  Ticket,
  DollarSign,
  Users,
  TrendingUp,
  Activity,
  Bot,
  Zap,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Filter,
  RefreshCw,
  AlertCircle,
} from "lucide-react";

// Attach the session token (if any) to every backend request
function authHeaders() {
  const token = localStorage.getItem("access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function SupportOpsDashboard() {
  const [metrics, setMetrics] = useState(null);
  const [systemHealth, setSystemHealth] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [timeframe, setTimeframe] = useState("30d");

  // Real-time activity stream via SSE
  const { events: liveEvents = [], isConnected: isStreamConnected } = useAgentStream(
    API_ENDPOINTS.activityStream
  );

  // Fetch production metrics (required) and system health (optional)
  const loadDashboard = useCallback(
    async (signal) => {
      try {
        setError(null);
        console.log("DASHBOARD FETCH →", API_ENDPOINTS.metrics(timeframe)); // temporary debug, remove later

        const [metricsResult, healthResult] = await Promise.allSettled([
          fetch(API_ENDPOINTS.metrics(timeframe), { headers: authHeaders(), signal }),
          fetch(API_ENDPOINTS.health, { headers: authHeaders(), signal }),
        ]);

        if (metricsResult.status === "rejected") throw metricsResult.reason;

        const metricsRes = metricsResult.value;
        if (metricsRes.status === 401) {
          throw new Error("Your session expired. Please log in again.");
        }
        if (!metricsRes.ok) {
          throw new Error("Failed to sync latest operational data from Nexus Core.");
        }
        setMetrics(await metricsRes.json());

        // A failing health check shouldn't take the whole dashboard down
        if (healthResult.status === "fulfilled" && healthResult.value.ok) {
          setSystemHealth(await healthResult.value.json());
        }
      } catch (err) {
        if (err.name === "AbortError" || signal?.aborted) return;
        setError(err.message || "An unexpected error occurred.");
      } finally {
        if (!signal?.aborted) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [timeframe]
  );

  // Load on mount and when the timeframe changes; cancel in-flight requests on change/unmount
  useEffect(() => {
    const controller = new AbortController();
    loadDashboard(controller.signal);
    return () => controller.abort();
  }, [loadDashboard]);

  const handleManualSync = () => {
    setIsRefreshing(true);
    loadDashboard();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#030712] flex flex-col items-center justify-center text-slate-300">
        <RefreshCw className="h-8 w-8 animate-spin text-cyan-400 mb-4" />
        <p className="text-sm font-medium">Connecting to Nexus-Core Swarm Engine...</p>
      </div>
    );
  }

  // Full-page error only when there's nothing to show yet
  if (error && !metrics) {
    return (
      <div className="min-h-screen bg-[#030712] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-slate-900/80 border border-red-500/30 p-6 rounded-2xl text-center backdrop-blur-xl">
          <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white mb-2">Connection Failed</h3>
          <p className="text-xs text-slate-400 mb-6">{error}</p>
          <button
            type="button"
            onClick={handleManualSync}
            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold rounded-xl text-xs transition-colors"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  const kpiCards = [
    {
      label: "Monthly Recurring Revenue",
      value: `$${(metrics?.mrr ?? 0).toLocaleString()}`,
      change: metrics?.mrrChange ?? "+0%",
      icon: DollarSign,
      glowColor: "from-emerald-500/20 to-transparent",
      iconBg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    },
    {
      label: "Active Customers",
      value: (metrics?.customers ?? 0).toLocaleString(),
      change: metrics?.customersChange ?? "+0",
      icon: Users,
      glowColor: "from-blue-500/20 to-transparent",
      iconBg: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    },
    {
      label: `Tickets Processed (${timeframe})`,
      value: (metrics?.tickets ?? 0).toLocaleString(),
      change: metrics?.ticketsChange ?? "+0%",
      icon: Ticket,
      glowColor: "from-purple-500/20 to-transparent",
      iconBg: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    },
    {
      label: "AI Resolution Rate",
      value: `${metrics?.aiResolutionRate ?? 0}%`,
      change: metrics?.aiResolutionRateChange ?? "+0%",
      icon: Sparkles,
      glowColor: "from-cyan-500/20 to-transparent",
      iconBg: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    },
  ];

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 px-4 sm:px-6 lg:px-8 py-8 font-sans selection:bg-cyan-500 selection:text-black relative overflow-hidden">
      {/* Background Radial Glow */}
      <div className="absolute top-0 left-1/4 -z-10 w-96 h-96 bg-cyan-500/10 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute top-1/3 right-10 -z-10 w-96 h-96 bg-purple-500/10 rounded-full blur-[128px] pointer-events-none" />

      {/* Refresh error banner (keeps the last good data on screen) */}
      {error && (
        <div className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-300">
          <span className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" /> {error} Showing last synced data.
          </span>
          <button
            type="button"
            onClick={handleManualSync}
            className="font-semibold text-red-200 hover:text-white underline underline-offset-2"
          >
            Retry
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              <span className="relative flex h-2 w-2">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isStreamConnected ? "bg-cyan-400" : "bg-amber-400"
                    } opacity-75`}
                />
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${isStreamConnected ? "bg-cyan-500" : "bg-amber-500"
                    }`}
                />
              </span>
              {isStreamConnected ? "Nexus Swarm Active" : "Polling Mode"}
            </span>
            <span className="text-xs text-slate-500">v2.4.0-production</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            SupportOps Command Center
          </h1>
        </div>

        {/* Control Bar */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleManualSync}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl border border-slate-800 transition-all shadow-sm active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            Sync Swarm
          </button>

          <div className="relative">
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="appearance-none flex items-center gap-2 px-3.5 py-2 pr-8 text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl border border-slate-800 transition-all shadow-sm focus:outline-none cursor-pointer"
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
            </select>
            <Filter className="h-3.5 w-3.5 absolute right-2.5 top-2.5 text-slate-400 pointer-events-none" />
          </div>

          <button
            type="button"
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 rounded-xl transition-all shadow-lg shadow-cyan-500/20 active:scale-95"
          >
            <Zap className="h-3.5 w-3.5 fill-current" />
            Deploy Agent Rule
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
        {kpiCards.map((stat) => (
          <div
            key={stat.label}
            className="relative group overflow-hidden rounded-2xl bg-slate-900/40 border border-slate-800/80 p-5 backdrop-blur-xl hover:border-slate-700/80 transition-all duration-300 hover:shadow-2xl hover:shadow-black/50"
          >
            <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${stat.glowColor}`} />

            <div className="flex items-center justify-between mb-4">
              <div className={`p-2.5 rounded-xl border ${stat.iconBg}`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <TrendingUp className="h-3 w-3" />
                {stat.change}
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-3xl font-extrabold tracking-tight text-white group-hover:scale-[1.01] transition-transform origin-left">
                {stat.value}
              </div>
              <div className="text-xs font-medium text-slate-400">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Operational Feed & Telemetry Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
        {/* SSE Event Stream */}
        <div className="xl:col-span-2 rounded-2xl bg-slate-900/40 border border-slate-800/80 p-6 backdrop-blur-xl flex flex-col justify-between min-h-[300px]">
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  <Activity className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-white">Live Swarm Activity</h2>
                  <p className="text-xs text-slate-400">Real-time agent execution stream</p>
                </div>
              </div>
              <span className="text-xs text-slate-400 flex items-center gap-1 bg-slate-800/50 px-2.5 py-1 rounded-lg border border-slate-700/50">
                <Clock className="h-3 w-3 text-cyan-400" /> SSE Stream
              </span>
            </div>

            <div className="space-y-3">
              {liveEvents.length > 0 ? (
                liveEvents.slice(0, 4).map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-800/30 hover:bg-slate-800/50 border border-slate-800 transition-colors animate-in fade-in duration-300"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                      <span className="text-sm text-slate-200">{item.description}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                        {item.agentType || "Agent Swarm"}
                      </span>
                      <ArrowUpRight className="h-3.5 w-3.5 text-slate-500" />
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-slate-500">
                  Waiting for active swarm events...
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Streamed from Nexus Core Agent Pipeline</span>
            <span className="text-cyan-400 font-mono text-[11px]">
              Status: {isStreamConnected ? "Active" : "Connecting..."}
            </span>
          </div>
        </div>

        {/* System Telemetry */}
        <div className="rounded-2xl bg-slate-900/40 border border-slate-800/80 p-6 backdrop-blur-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Bot className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-white">System Health</h2>
                  <p className="text-xs text-slate-400">Nexus Core Engine Telemetry</p>
                </div>
              </div>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {systemHealth?.uptime || "99.9% Uptime"}
              </span>
            </div>

            <div className="space-y-3.5 text-sm">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/20 border border-slate-800/50">
                <span className="text-slate-300 text-xs">AI Inference Engine</span>
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" /> {systemHealth?.aiEngine || "Operational"}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/20 border border-slate-800/50">
                <span className="text-slate-300 text-xs">Workflow Orchestrator</span>
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" /> {systemHealth?.orchestrator || "Stable"}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/20 border border-slate-800/50">
                <span className="text-slate-300 text-xs">Average API Latency</span>
                <span className="text-xs font-mono text-cyan-400 font-semibold">
                  {systemHealth?.apiLatencyMs ? `${systemHealth.apiLatencyMs}ms` : "118ms"}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800/80">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>
                Model Routing: <strong className="text-slate-200">GPT-4o / Claude 3.5</strong>
              </span>
              <span className="text-emerald-400 font-medium">Production</span>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 rounded-2xl bg-slate-900/40 border border-slate-800/80 p-1 backdrop-blur-xl">
          <RevenueChart timeframe={timeframe} />
        </div>
        <div className="rounded-2xl bg-slate-900/40 border border-slate-800/80 p-1 backdrop-blur-xl">
          <AIImpact timeframe={timeframe} />
        </div>
      </div>
    </div>
  );
}
