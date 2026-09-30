import React from "react";
import { AlertTriangle, ShieldAlert } from "lucide-react";

export default function HallucinationAlert({ flags, risk }) {
  if (!flags || flags.length === 0) return null;

  return (
    <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5 space-y-3">
      <div className="flex items-center gap-2 text-red-400 font-bold">
        <AlertTriangle size={16} />
        AI Hallucination Risk Detected
      </div>

      <p className="text-sm text-slate-300">
        This response was blocked due to reliability
        concerns.
      </p>

      <div className="flex flex-wrap gap-2">
        {flags.map(f => (
          <span
            key={f}
            className="text-[10px] px-3 py-1 rounded-full bg-red-500/20 border border-red-500/30 text-red-300 font-mono"
          >
            {f}
          </span>
        ))}
      </div>

      <div className="flex items-center gap-2 text-xs text-red-300">
        <ShieldAlert size={12} />
        Risk Score: {risk}/100 — Human review required
      </div>
    </div>
  );
}
