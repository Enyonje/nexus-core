import { useEffect, useState } from "react";
import api from "../lib/api";
import { AlertOctagon } from "lucide-react";

export default function IncidentCommandCenter() {
  const [incidents, setIncidents] = useState([]);

  useEffect(() => {
    api.get("/incidents").then((res) => setIncidents(res.data));

    const ws = new WebSocket("wss://supportops-ai.onrender.com/ws");

    ws.onmessage = (e) => {
      const { event, payload } = JSON.parse(e.data);
      if (event.startsWith("incident")) {
        setIncidents((prev) => [payload, ...prev.filter((i) => i._id !== payload._id)]);
      }
    };

    return () => ws.close();
  }, []);

  return (
    <div className="space-y-8 p-8 text-white">
      {/* Header */}
      <div className="border-b border-white/10 pb-4">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
          Incident Command Center
        </h1>
        <p className="text-slate-400 mt-2">Live feed of active incidents</p>
      </div>

      {/* Incident list */}
      {incidents.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center text-gray-400">
          No active incidents at the moment.
        </div>
      ) : (
        <div className="grid gap-6">
          {incidents.map((incident) => (
            <div
              key={incident._id}
              className="rounded-2xl bg-white/5 border border-white/10 p-6 hover:bg-white/10 transition"
            >
              {/* Title + Severity */}
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-white">{incident.title}</h3>
                <span
                  className={`px-3 py-1 text-xs font-bold rounded-full ${
                    incident.severity === "critical"
                      ? "bg-red-600 text-white"
                      : incident.severity === "high"
                      ? "bg-orange-500 text-white"
                      : "bg-slate-600 text-white"
                  }`}
                >
                  {incident.severity.toUpperCase()}
                </span>
              </div>

              {/* Status */}
              <div className="text-sm text-slate-400 mb-4">
                Status: <span className="font-medium text-white">{incident.status}</span>
              </div>

              {/* Timeline (last 3 events) */}
              <div className="space-y-2 text-sm">
                {incident.timeline.slice(-3).map((t, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <AlertOctagon size={14} className="text-blue-500 mt-1" />
                    <span className="text-slate-200">{t.message}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}