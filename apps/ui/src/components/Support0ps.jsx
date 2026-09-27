"use client";

import React, { useEffect, useState } from "react";

export function SupportOps({ workflowId, tenantId, onClose }) {
    const [logs, setLogs] = useState([]);
    const [status, setStatus] = useState("CONNECTING");

    useEffect(() => {
        if (!workflowId) return;

        // Connect to the FastAPI SSE streaming route
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const eventSource = new EventSource(
            `${apiBaseUrl}/api/v1/stream/workflow/${workflowId}`
        );

        eventSource.onmessage = (event) => {
            try {
                const payload = JSON.parse(event.data);

                if (payload.event === "DONE") {
                    setStatus(payload.overall_status);
                    eventSource.close();
                    return;
                }

                if (payload.overall_status) {
                    setStatus(payload.overall_status);
                }

                if (payload.log) {
                    setLogs((prev) => [...prev, payload.log]);
                }
            } catch (err) {
                console.error("Failed to parse SSE payload:", err);
            }
        };

        eventSource.onerror = (err) => {
            console.error("SSE Connection Error:", err);
            setStatus("DISCONNECTED");
            eventSource.close();
        };

        return () => {
            eventSource.close();
        };
    }, [workflowId, tenantId]);

    if (!workflowId) return null;

    return (
        <div className="fixed inset-y-0 right-0 w-full max-w-md bg-slate-900 border-l border-slate-800 text-slate-100 shadow-2xl z-50 flex flex-col">
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <div>
                    <h3 className="font-mono text-sm font-semibold text-emerald-400">
                        SupportOps AI — Agent Execution Drawer
                    </h3>
                    <p className="text-xs text-slate-400 font-mono">ID: {workflowId}</p>
                </div>
                <button
                    onClick={onClose}
                    className="text-slate-400 hover:text-white text-sm px-2 py-1"
                >
                    ✕
                </button>
            </div>

            {/* Real-time Status Header */}
            <div className="bg-slate-950 px-4 py-2 border-b border-slate-800 flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">STATUS:</span>
                <span
                    className={`px-2 py-0.5 rounded text-xs font-bold ${status === "RESOLVED" || status === "COMPLETED"
                        ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                        : status === "ESCALATED"
                            ? "bg-amber-950 text-amber-400 border border-amber-800"
                            : "bg-blue-950 text-blue-400 animate-pulse"
                        }`}
                >
                    {status}
                </span>
            </div>

            {/* Live Activity Telemetry Feed */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-xs">
                {logs.map((item, idx) => (
                    <div
                        key={idx}
                        className="p-3 rounded border border-slate-800 bg-slate-950/60 flex flex-col space-y-1"
                    >
                        <div className="flex items-center justify-between text-slate-400">
                            <span className="text-emerald-400 font-bold">{item.step}</span>
                            <span className="text-[10px]">
                                {new Date(item.timestamp).toLocaleTimeString()}
                            </span>
                        </div>
                        <div className="text-slate-200">
                            {typeof item.detail === "object"
                                ? JSON.stringify(item.detail, null, 2)
                                : item.detail}
                        </div>
                    </div>
                ))}

                {logs.length === 0 && (
                    <div className="text-center py-8 text-slate-500 italic">
                        Waiting for initial execution telemetry...
                    </div>
                )}
            </div>
        </div>
    );
}