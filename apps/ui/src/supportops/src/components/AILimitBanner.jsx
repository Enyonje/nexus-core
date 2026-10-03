import React from "react";
import { AlertTriangle } from "lucide-react";

export default function AILimitBanner({ remaining }) {
  if (remaining > 1) return null;

  return (
    <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl flex items-center gap-3">
      <AlertTriangle className="text-red-400" size={18} />
      <p className="text-sm text-red-300">
        AI usage almost exhausted. Upgrade to Pro to continue automation.
      </p>
    </div>
  );
}
