import React from "react";
import { DollarSign } from "lucide-react";

export default function RevenueChart() {
  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
      <div className="flex items-center gap-3 mb-3">
        <DollarSign className="text-slate-400" />
        <h2 className="text-lg font-semibold">Revenue history</h2>
      </div>
      <p className="text-sm text-slate-400">
        Unavailable: historical invoice records and billing intervals are not
        connected to this dashboard yet.
      </p>
    </div>
  );
}
