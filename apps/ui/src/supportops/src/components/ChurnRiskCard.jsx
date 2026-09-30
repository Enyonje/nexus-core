import React from "react";
import { AlertTriangle, ShieldAlert } from "lucide-react";

export default function ChurnRiskCard({ risk }) {
  if (!risk) return null;

  const colors = {
    High: "text-red-400 bg-red-500/10 border-red-500/30",
    Medium: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30",
    Low: "text-green-400 bg-green-500/10 border-green-500/30"
  };

  return (
    <div className={`rounded-3xl border p-6 ${colors[risk.risk_level]}`}>
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle />
        <h3 className="font-bold text-lg">Churn Risk Prediction</h3>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase opacity-70">Risk Level</p>
          <p className="text-3xl font-black">{risk.risk_level}</p>
        </div>

        <div>
          <p className="text-xs uppercase opacity-70">Probability</p>
          <p className="text-3xl font-black">
            {(risk.churn_probability * 100).toFixed(0)}%
          </p>
        </div>
      </div>

      <p className="text-xs mt-4 opacity-80">{risk.explanation}</p>

      <div className="mt-4 flex items-center gap-2 text-xs">
        <ShieldAlert size={14} />
        Proactive intervention recommended
      </div>
    </div>
  );
}
