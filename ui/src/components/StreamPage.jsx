import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthProvider";

export default function StreamPage() {
  const { executionId } = useParams();
  const { token } = useAuth();
  const [events, setEvents] = useState([]);
  const [status, setStatus] = useState("connecting");
  const scrollRef = useRef(null);

  // Auto-scroll logic: triggers every time 'events' array grows
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [events]);

  useEffect(() => {
    // 1. Connection string using the query token for Auth
    const url = `${import.meta.env.VITE_API_URL}/api/executions/${executionId}/stream?token=${token}`;
    const sse = new EventSource(url, { withCredentials: true });

    sse.onopen = () => setStatus("active");

    sse.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data);
        
        // Adjusting to your backend's publishEvent structure
        // If backend sends { event: 'x', ...data }, we capture it all
        const newEvent = {
          type: payload.event || "TRACE",
          body: payload,
          timestamp: new Date().toLocaleTimeString(),
          id: crypto.randomUUID()
        };

        setEvents((prev) => [...prev, newEvent]);
      } catch (err) {
        console.error("Stream Parse Error:", err);
      }
    };

    sse.onerror = () => {
      // Don't immediately set to error if it's just a temporary reconnect
      if (sse.readyState === EventSource.CLOSED) {
        setStatus("interrupted");
      }
    };

    return () => sse.close();
  }, [executionId, token]);

  // Color mapping for different execution states
  const getEventColor = (type) => {
    if (type.includes("failed")) return "text-red-400";
    if (type.includes("completed")) return "text-green-400";
    if (type.includes("paused")) return "text-amber-400";
    if (type.includes("connected")) return "text-blue-400";
    return "text-indigo-400";
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 p-8 font-mono">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header Section */}
        <header className="flex justify-between items-center border-b border-white/10 pb-4">
          <div className="space-y-1">
            <h1 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-ping" />
              Nexus <span className="text-blue-500">Live Trace</span>
            </h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-[0.3em]">System ID: {executionId}</p>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Link Status</p>
              <p className={`text-[10px] uppercase font-black ${status === 'active' ? 'text-green-500' : 'text-red-500'}`}>
                {status}
              </p>
            </div>
            <Link 
              to="/dashboard" 
              className="text-[10px] font-black border border-white/10 px-4 py-2 hover:bg-red-500/10 hover:border-red-500/50 hover:text-red-400 transition-all uppercase tracking-widest"
            >
              Close Link
            </Link>
          </div>
        </header>

        {/* Terminal Output */}
        <div 
          ref={scrollRef}
          className="bg-slate-950/80 border border-white/5 rounded-xl h-[65vh] overflow-y-auto p-6 space-y-2 relative shadow-2xl custom-scrollbar"
        >
          {/* Scanline Effect overlay */}
          <div className="absolute inset-0 pointer-events-none bg-scanline opacity-[0.03]" />

          {events.length === 0 && (
            <div className="h-full flex items-center justify-center">
              <div className="text-slate-700 animate-pulse text-xs uppercase tracking-[0.5em]">
                Initializing Neural Uplink...
              </div>
            </div>
          )}

          {events.map((ev) => (
            <div key={ev.id} className="text-[12px] flex gap-4 font-mono group border-l border-transparent hover:border-blue-500/50 hover:bg-white/[0.01] transition-all pl-2">
              <span className="text-slate-600 shrink-0 select-none">{ev.timestamp}</span>
              <span className={`shrink-0 uppercase font-black tracking-tighter ${getEventColor(ev.type)}`}>
                {ev.type}
              </span>
              <span className="text-slate-400 leading-relaxed">
                {/* We remove the 'event' key from display since it's already in the badge */}
                {Object.entries(ev.body)
                  .filter(([key]) => key !== 'event')
                  .map(([key, val]) => `${key}=${typeof val === 'object' ? JSON.stringify(val) : val}`)
                  .join(" | ")}
              </span>
            </div>
          ))}
        </div>

        {/* Footer Metrics */}
        <footer className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricBox label="Data Packets" value={events.length} color="text-white" />
          <MetricBox label="Signal Strength" value="Optimal" color="text-green-500" />
          <MetricBox label="Encryption" value="Quantum-Secure" color="text-blue-500" />
        </footer>
      </div>
    </div>
  );
}

/* Sub-component for cleanup */
function MetricBox({ label, value, color }) {
  return (
    <div className="bg-slate-900/40 border border-white/5 p-4 rounded-xl backdrop-blur-md">
      <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest mb-1">{label}</p>
      <p className={`text-lg font-black uppercase tracking-tight ${color}`}>{value}</p>
    </div>
  );
}