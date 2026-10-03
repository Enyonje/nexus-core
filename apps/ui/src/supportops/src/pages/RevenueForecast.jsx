import { useEffect, useState } from "react";
import { TrendingUp, DollarSign } from "lucide-react";

export default function RevenueForecast() {
  const [months, setMonths] = useState(6);
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch(`/api/v1/revenue/forecast?months=${months}`)
      .then((res) => res.json())
      .then(setData)
      .catch((err) => console.error("Failed to load forecast", err));
  }, [months]);

  if (!data) {
    return (
      <div className="p-10 text-slate-400">
        Loading forecast…
      </div>
    );
  }

  return (
    <div className="space-y-12 p-8 text-white">
      {/* Header */}
      <header className="border-b border-white/10 pb-4">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
          Revenue Forecast Simulator
        </h1>
        <p className="text-slate-400 mt-2">
          Predictive revenue intelligence
        </p>
      </header>

      {/* Controls */}
      <div className="flex items-center gap-4">
        <label className="text-xs uppercase font-bold text-slate-400">
          Forecast Window
        </label>
        <select
          value={months}
          onChange={(e) => setMonths(Number(e.target.value))}
          className="bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
        >
          {[3, 6, 9, 12].map((m) => (
            <option key={m} value={m}>
              {m} months
            </option>
          ))}
        </select>
      </div>

      {/* KPI Summary */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KPI label="Current MRR" value={`$${data.current_mrr}`} />
        <KPI label="Monthly AI Savings" value={`$${data.ai_savings_monthly}`} />
        <KPI label="Forecast Horizon" value={`${months} months`} />
      </section>

      {/* Forecast Table */}
      <section className="bg-white/5 border border-white/10 rounded-3xl p-8">
        <h3 className="font-semibold mb-6 flex items-center gap-2 text-white">
          <TrendingUp className="text-blue-500" /> Revenue Projection
        </h3>

        <table className="w-full text-sm">
          <thead className="text-slate-400 uppercase text-xs border-b border-white/10">
            <tr>
              <th className="text-left py-2">Month</th>
              <th className="text-center">Base Case</th>
              <th className="text-center">Optimistic</th>
              <th className="text-center">Worst Case</th>
            </tr>
          </thead>
          <tbody>
            {data.forecast.map((row) => (
              <tr
                key={row.month}
                className="border-t border-white/5 hover:bg-white/5 transition"
              >
                <td className="py-3 font-mono text-slate-200">+{row.month}</td>
                <td className="text-center text-green-400 font-bold">
                  ${row.base_case}
                </td>
                <td className="text-center text-blue-400 font-bold">
                  ${row.optimistic}
                </td>
                <td className="text-center text-red-400 font-bold">
                  ${row.worst_case}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function KPI({ label, value }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition">
      <div className="flex items-center gap-2 text-slate-400 mb-2">
        <DollarSign size={16} className="text-blue-500" />
        <span className="text-xs uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-3xl font-bold text-white">{value}</p>
    </div>
  );
}