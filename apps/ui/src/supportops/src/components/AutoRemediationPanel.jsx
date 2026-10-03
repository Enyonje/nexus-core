import React from "react";
import { Bot, ShieldCheck, AlertTriangle } from "lucide-react";
import api from "../lib/api";

export default function AutoRemediationPanel({ ticket }) {
  if (!ticket) return null;

  const handleAnalyze = async () => {
    const res = await api.post("/remediation/analyze", {
      text: ticket.summary
    });
    alert(JSON.stringify(res.data, null, 2));
  };

  return (
    <div className="border border-white/10 rounded-2xl bg-white/5 p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Bot className="text-blue-500" />
        <h3 className="font-bold text-lg">AI Auto-Remediation</h3>
      </div>

      <p className="text-sm text-slate-400">
        AI scans this ticket and attempts safe self-healing actions.
      </p>

      <button
        onClick={handleAnalyze}
        className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 transition font-bold flex items-center justify-center gap-2"
      >
        <ShieldCheck size={18} /> Analyze & Remediate
      </button>

      <div className="flex items-center gap-2 text-xs text-amber-400">
        <AlertTriangle size={12} />
        Actions apply only if confidence ≥ 85%
      </div>
    </div>
  );
}
