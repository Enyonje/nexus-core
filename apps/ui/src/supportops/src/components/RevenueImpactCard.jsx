import React, { useState, useEffect } from "react";
import { DollarSign, TrendingUp } from "lucide-react";

export default function RevenueImpactCard({ impact }) {
  if (!impact) return null;

  return (
    <div className="rounded-3xl border border-green-500/30 bg-green-500/10 p-6">
      <div className="flex items-center gap-2 mb-4">
        <DollarSign className="text-green-400" />
        <h3 className="font-bold text-lg">Revenue Impact</h3>
      </div>

      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-xs uppercase text-slate-400">Loss Prevented</p>
          <p className="text-2xl font-black text-green-400">
            ${impact.ai_prevented_loss}
          </p>
        </div>

        <div>
          <p className="text-xs uppercase text-slate-400">Cost Saved</p>
          <p className="text-2xl font-black text-white">
            ${impact.manual_cost_saved}
          </p>
        </div>

        <div>
          <p className="text-xs uppercase text-slate-400">Risk Exposure</p>
          <p className="text-2xl font-black text-slate-300">
            ${impact.estimated_loss}
          </p>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-2 text-xs text-green-400">
        <TrendingUp size={14} />
        AI directly contributed to revenue protection
      </div>
    </div>
  );
}
