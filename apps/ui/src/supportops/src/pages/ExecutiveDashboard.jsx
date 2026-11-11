// src/pages/ExecutiveDashboard.jsx
import { useCallback, useEffect, useState } from "react";
import { DollarSign, HeartPulse, AlertTriangle, Bot, Users, RefreshCw } from "lucide-react";
import { api, isAbortError } from "../lib/api";

const ENDPOINT = "/api/v1/executive/overview";

const HEALTH_TONE = {
  healthy: "text-emerald-400",
  stable: "text-emerald-400",
  at_risk: "text-amber-400",
  "at risk": "text-amber-400",
  critical: "text-red-400",
};

const money = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? `$${n.toLocaleString()}` : "—";
};
const count = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString() : "—";
};

export default function ExecutiveDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (signal) => {
    setLoading(true);
    setError(null);
    try {
      const result = await api(ENDPOINT, { signal });
      if (signal?.aborted) return;
      setData(result?.data ?? result ?? {});
    } catch (e) {
      if (isAbortError(e) || signal?.aborted) return;
      setError(e.message || "Couldn't load the executive overview.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  if (loading && !data) {
    return (
      <div className="p-10 text-slate-400" aria-busy="true">
        <RefreshCw className="mr-2 inline h-4 w-4 animate-spin" aria-hidden="true" />
        Loading executive metrics…
      </div>
    );
  }

  if (error && !data) {
    return (
      <div role="alert" className="m-6 max-w-lg rounded-2xl border border-red-500/30 bg-red-500/10 p-6">
        <p className="font-semibold text-red-300">Couldn't load the executive overview</p>
        <p className="mt-1 text-sm text-red-200/80">{error}</p>
        <button
          type="button"
          onClick={() => load()}
          className="mt-4 rounded-xl border border-red-400/40 px-4 py-2 text-sm text-red-100 hover:bg-red-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300/70"
        >
          Try again
        </button>
      </div>
    );
  }

  const critical = Array.isArray(data?.critical_customers) ? data.critical_customers : [];
  const distribution = Array.isArray(data?.health_distribution) ? data.health_distribution : [];

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">Executive Command Center</h1>
          <p className="mt-2 text-slate-400">Company health at a glance</p>
        </div>
        <button
          type="button"
          onClick={() => load()}
          disabled={loading}
          aria-label="Refresh executive overview"
          className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-300 hover:text-white disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
        </button>
      </header>

      {error && (
        <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error} Showing the last data we had.
        </p>
      )}

      <section className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <KPI icon={<DollarSign className="text-blue-500" />} label="Revenue at risk" value={money(data?.revenue_at_risk)} />
        <KPI icon={<AlertTriangle className="text-yellow-500" />} label="Open tickets" value={count(data?.open_tickets)} />
        <KPI icon={<Bot className="text-green-500" />} label="AI resolutions" value={count(data?.ai_resolutions)} />
        <KPI icon={<Users className="text-purple-500" />} label="Critical customers" value={count(critical.length)} />
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-8">
        <h2 className="mb-6 flex items-center gap-2 font-semibold text-white">
          <HeartPulse className="text-pink-500" aria-hidden="true" /> Customer health distribution
        </h2>
        {distribution.length === 0 ? (
          <p className="text-sm text-slate-400">No health data yet. Scores appear once customers have activity.</p>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {distribution.map((h, i) => (
              <div key={h?.status ?? i} className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center transition hover:bg-white/10">
                <p className={`text-xs capitalize ${HEALTH_TONE[String(h?.status).toLowerCase()] ?? "text-slate-400"}`}>
                  {String(h?.status ?? "Unknown").replace(/_/g, " ")}
                </p>
                <p className="mt-2 text-3xl font-bold text-white">{count(h?.count)}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-red-500/20 bg-red-500/5 p-8">
        <h2 className="mb-6 flex items-center gap-2 font-semibold text-red-400">
          <AlertTriangle aria-hidden="true" /> Immediate attention required
        </h2>
        {critical.length === 0 ? (
          <p className="text-sm text-slate-400">No customers need urgent attention right now.</p>
        ) : (
          <ul className="space-y-4">
            {critical.map((c, i) => (
              <li key={c?.customer_id ?? i} className="flex justify-between rounded-xl bg-black/30 p-4 transition hover:bg-black/50">
                <span className="font-mono text-slate-200">{c?.customer_id ?? "Unknown customer"}</span>
                <span className="font-bold text-red-400" title="Health score">{c?.health_score ?? "—"}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function KPI({ icon, label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 transition hover:bg-white/10">
      <div className="mb-2 flex items-center gap-2 text-slate-400">
        <span aria-hidden="true">{icon}</span>
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-3xl font-bold text-white">{value}</p>
    </div>
  );
}