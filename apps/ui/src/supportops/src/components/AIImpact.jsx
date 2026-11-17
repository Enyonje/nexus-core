import React from "react";
import { Sparkles } from "lucide-react";

export default function AIImpact({ metrics, timeframe = "30d" }) {
  const events = metrics?.aiUsageEvents;
  const cost = metrics?.aiCostUsd;
  const tokens = metrics?.aiTokens;

  const available = (value) =>
    value !== null && value !== undefined && Number.isFinite(Number(value));

  return (
    <div className="rounded-2xl bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-white/10 p-6">
      <div className="flex items-center gap-3 mb-4">
        <Sparkles className="text-blue-400" />
        <h2 className="text-lg font-semibold">Recorded AI usage</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-slate-400">AI usage events</p>
          <p className="text-2xl font-bold text-white">
            {available(events) ? Number(events).toLocaleString() : "Unavailable"}
          </p>
        </div>
        <div>
          <p className="text-sm text-slate-400">Recorded AI cost</p>
          <p className="text-2xl font-bold text-white">
            {available(cost) ? `$${Number(cost).toFixed(4)}` : "Unavailable"}
          </p>
        </div>
        <div>
          <p className="text-sm text-slate-400">Tokens processed</p>
          <p className="text-lg font-semibold text-white">
            {available(tokens) ? Number(tokens).toLocaleString() : "Unavailable"}
          </p>
        </div>
      </div>

      <p className="text-xs text-slate-400 mt-4">
        Reporting period: {timeframe}. These figures reflect recorded AI usage,
        not verified ticket resolutions or estimated savings.
      </p>
    </div>
  );
}
