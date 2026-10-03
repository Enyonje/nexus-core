import { useEffect, useState } from "react";
import { DollarSign, TrendingUp, Users, Bot, ShieldCheck } from "lucide-react";
import { p } from "../config/paths";

export default function InvestorMode() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch(p("/api/v1/investors/metrics"))
      .then((res) => res.json())
      .then(setData)
      .catch((err) => console.error("Failed to load investor metrics", err));
  }, []);

  if (!data) {
    return (
      <div className="p-10 text-slate-400">
        Loading investor metrics…
      </div>
    );
  }

  return (
    <div className="space-y-12 p-8 text-white">
      {/* Header */}
      <header className="border-b border-white/10 pb-4">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
          Investor Metrics
        </h1>
        <p className="text-slate-400 mt-2">
          Boardroom-grade SaaS performance snapshot
        </p>
      </header>

      {/* Top metrics */}
      <section className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-6">
        <Metric icon={DollarSign} label="MRR" value={`$${data.mrr}`} accent="text-green-400" />
        <Metric icon={TrendingUp} label="ARR" value={`$${data.arr}`} accent="text-blue-400" />
        <Metric icon={Users} label="Customers" value={data.customer_count} accent="text-purple-400" />
        <Metric icon={ShieldCheck} label="NRR" value={`${data.net_revenue_retention}%`} accent="text-teal-400" />
        <Metric icon={Bot} label="AI Resolution" value={`${data.ai_resolution_rate}%`} accent="text-pink-400" />
      </section>

      {/* Deep metrics */}
      <section className="bg-white/5 border border-white/10 rounded-3xl p-10 grid grid-cols-1 md:grid-cols-3 gap-8">
        <DeepMetric label="Churn Rate" value={`${data.churn_rate}%`} />
        <DeepMetric label="LTV" value={`$${data.ltv}`} />
        <DeepMetric label="LTV / CAC" value={data.ltv_cac_ratio} highlight />
      </section>
    </div>
  );
}

function Metric({ icon: Icon, label, value, accent }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition">
      <div className="flex items-center gap-2 text-slate-400 mb-2">
        <Icon size={16} className={accent} />
        <span className="text-xs uppercase font-bold">{label}</span>
      </div>
      <p className="text-3xl font-bold text-white">{value}</p>
    </div>
  );
}

function DeepMetric({ label, value, highlight }) {
  return (
    <div
      className={`rounded-2xl p-6 ${highlight
          ? "bg-blue-500/10 border border-blue-500/30"
          : "bg-white/5 border border-white/10 hover:bg-white/10 transition"
        }`}
    >
      <p className="text-xs uppercase tracking-wide text-slate-400 mb-2">{label}</p>
      <p
        className={`text-4xl font-bold ${highlight ? "text-blue-400" : "text-white"
          }`}
      >
        {value}
      </p>
    </div>
  );
}