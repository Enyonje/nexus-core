import React, { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const data = [
  { month: "Jan", revenue: 1200 },
  { month: "Feb", revenue: 1450 },
  { month: "Mar", revenue: 1720 },
  { month: "Apr", revenue: 2100 },
  { month: "May", revenue: 2480 },
];

export default function RevenueChart() {
  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
      <h2 className="text-lg font-semibold mb-4">
        Monthly Recurring Revenue
      </h2>

      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <XAxis dataKey="month" stroke="#94a3b8" />
            <YAxis stroke="#94a3b8" />
            <Tooltip
              contentStyle={{
                background: "#020617",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "12px",
              }}
            />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="#3b82f6"
              strokeWidth={3}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}