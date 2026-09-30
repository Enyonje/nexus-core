import React from "react";
import { ShieldCheck } from "lucide-react";

export default function AuditLogTable({ logs }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
      <h3 className="flex items-center gap-2 text-sm font-black uppercase text-blue-400 mb-6">
        <ShieldCheck size={16} /> Compliance Audit Log
      </h3>

      <div className="space-y-3 max-h-[420px] overflow-y-auto">
        {logs.map(log => (
          <div
            key={log.id}
            className="flex justify-between items-center bg-slate-900/60 p-4 rounded-xl border border-white/5"
          >
            <div>
              <p className="text-xs font-bold text-white">
                {log.action} → {log.resource}
              </p>
              <p className="text-[10px] text-slate-400">
                Actor: {log.actor_type} · {new Date(log.created_at).toLocaleString()}
              </p>
            </div>

            <span className="text-[10px] px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 font-black">
              Logged
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
