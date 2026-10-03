import React, { useState } from "react";
import { AlertTriangle } from "lucide-react";

export default function AIBudgetWarning() {
  return (
    <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl flex items-center gap-3 text-amber-400 text-sm font-semibold">
      <AlertTriangle size={18} />
      AI usage nearing monthly limit. Consider upgrading your plan.
    </div>
  );
}
