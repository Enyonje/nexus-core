import { useEffect, useState } from "react";
import { BarChart3, DollarSign, Bot, User, Clock } from "lucide-react";

export default function AdminAnalytics() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch("/api/org/analytics", { credentials: "include" })
      .then((r) => r.json())
      .then(setData)
      .catch((err) => console.error("Failed to load analytics", err));
  }, []);

  if (!data) {
    return (
      <div className="space-y-8">
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Org Analytics
        </h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-28 rounded-2xl bg-white/5 border border-white/10 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  const Stat = ({ icon: Icon, label, value }) => (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-6 hover:bg-white/10 transition">
      <Icon className="text-blue-500 mb-3" size={20} />
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-3xl font-bold text-white">{value}</p>
    </div>
  );

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
          Org Analytics
        </h1>
      </div>

      {/* Stats grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        <Stat icon={BarChart3} label="Total Tickets" value={data.totalTickets} />
        <Stat
          icon={Bot}
          label="AI Resolved"
          value={`${data.aiResolutionRate}%`}
        />
        <Stat icon={User} label="Human Overrides" value={data.humanResolved} />
        <Stat
          icon={Clock}
          label="Avg Response (min)"
          value={Math.round(data.avgResponseTime)}
        />
        <Stat
          icon={DollarSign}
          label="AI Spend"
          value={`$${data.totalAISpend.toFixed(2)}`}
        />
      </section>

      {/* Insight card */}
      <section className="rounded-3xl border border-white/10 bg-white/5 p-8">
        <p className="text-xs uppercase tracking-wide text-slate-400 mb-4">
          Insight
        </p>
        <p className="text-slate-300 leading-relaxed">
          Your AI is currently resolving{" "}
          <span className="text-blue-400 font-bold">
            {data.aiResolutionRate}%
          </span>{" "}
          of tickets autonomously, reducing operational cost and response times.
        </p>
      </section>
    </div>
  );
}