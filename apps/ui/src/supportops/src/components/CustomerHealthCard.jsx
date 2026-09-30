import React from "react";
import { HeartPulse, Activity } from "lucide-react";

export default function CustomerHealthCard({ health }) {
  if (!health) return null;

  const styles = {
    Healthy: "bg-green-500/10 border-green-500/30 text-green-400",
    "At Risk": "bg-yellow-500/10 border-yellow-500/30 text-yellow-400",
    Critical: "bg-red-500/10 border-red-500/30 text-red-400"
  };

  return (
    <div className={`rounded-3xl border p-8 ${styles[health.status]}`}>
      <div className="flex items-center gap-2 mb-4">
        <HeartPulse />
        <h3 className="font-bold text-xl">Customer Health</h3>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase opacity-70">Status</p>
          <p className="text-3xl font-black">{health.status}</p>
        </div>

        <div>
          <p className="text-xs uppercase opacity-70">Score</p>
          <p className="text-5xl font-black">{health.health_score}</p>
        </div>
      </div>

      <p className="text-xs opacity-80 mt-4">{health.summary}</p>

      <div className="mt-6 flex items-center gap-2 text-xs">
        <Activity size={14} />
        Real-time AI assessment
      </div>
    </div>
  );
}
