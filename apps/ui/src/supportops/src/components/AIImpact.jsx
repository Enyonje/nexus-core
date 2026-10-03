import React, { useState } from "react";
import { Sparkles } from "lucide-react";

export default function AIImpact() {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-white/10 p-6">
      <div className="flex items-center gap-3 mb-3">
        <Sparkles className="text-blue-400" />
        <h2 className="text-lg font-semibold">
          AI Impact
        </h2>
      </div>

      <p className="text-slate-300 text-sm mb-4">
        Your AI agents resolved <strong>842 tickets</strong> automatically this
        month.
      </p>

      <div className="text-3xl font-bold text-emerald-400">
        ~$6,300 saved
      </div>

      <p className="text-xs text-slate-400 mt-1">
        Estimated agent cost reduction
      </p>
    </div>
  );
}
