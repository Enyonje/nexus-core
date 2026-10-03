import React from "react";
import { BrainCircuit } from "lucide-react";

export default function RCAInsightPanel({ report }) {
  if (!report) return null;

  return (
    <div className="bg-gradient-to-br from-blue-600/10 to-indigo-600/10 
                    border border-blue-500/20 rounded-3xl p-6">
      <h3 className="flex items-center gap-2 text-sm font-black uppercase text-blue-400 mb-4">
        <BrainCircuit size={16} /> AI Root Cause Analysis
      </h3>

      <p className="text-white font-bold mb-2">{report.root_cause}</p>

      <p className="text-xs text-slate-400 mb-4">
        Confidence: <span className="text-blue-400 font-black">{report.confidence}</span>
      </p>

      <div className="mb-4">
        <p className="text-xs uppercase font-bold text-slate-400 mb-1">
          Suggested Fix
        </p>
        <p className="text-sm text-slate-200">{report.suggested_fix}</p>
      </div>

      <div>
        <p className="text-xs uppercase font-bold text-slate-400 mb-2">
          Contributing Factors
        </p>
        <ul className="list-disc list-inside text-xs text-slate-300 space-y-1">
          {report.contributing_factors.map((f, i) => (
            <li key={i}>{f}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

