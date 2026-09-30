import React, { useState, useEffect } from "react";
import { ClockAlert } from "lucide-react";

export default function SLARiskBadge({ status, score }) {
  const color =
    status === "BREACH_IMMINENT"
      ? "red"
      : status === "AT_RISK"
        ? "amber"
        : "green";

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1 rounded-full
      bg-${color}-500/10 border border-${color}-500/30
      text-${color}-400 text-[10px] font-black uppercase`}
    >
      <ClockAlert size={12} />
      SLA {status.replace("_", " ")} ({score}%)
    </div>
  );
}
