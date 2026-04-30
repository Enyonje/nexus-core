import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthProvider";

export default function StreamPage() {
  const { executionId } = useParams();
  const { token } = useAuth(); // Ensure this comes from your Auth Context
  const [events, setEvents] = useState([]);
  const [status, setStatus] = useState("connecting");
  const scrollRef = useRef(null);

  // Handle auto-scrolling when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [events]);

  useEffect(() => {
    // GUARD: Prevent "token=undefined" 401 errors. 
    // Wait until the AuthProvider has loaded the token from storage.
    if (!token || token === "undefined") {
      setStatus("authenticating");
      return;
    }

    const url = `${import.meta.env.VITE_API_URL}/api/executions/${executionId}/stream?token=${token}`;
    const sse = new EventSource(url, { withCredentials: true });

    sse.onopen = () => {
      console.log("Nexus Link: Synchronized");
      setStatus("active");
    };

    sse.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data);
        
        // Handle the "nexus_connected" handshake or standard events
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
      // If the server closes the connection or auth fails
      if (sse.readyState === EventSource.CLOSED) {
        setStatus("interrupted");
      }
      sse.close();
    };

    return () => sse.close();
  }, [executionId, token]); // Effect re-runs once token is populated

  const getEventColor = (type) => {
    const t = type.toLowerCase();
    if (t.includes("fail") || t.includes("error")) return "text-red-400";
    if (t.includes("complete") || t.includes("success")) return "text-green-400";
    if (t.includes("connect")) return "text-blue-400";
    return "text-indigo-400";
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 p-8 font-mono">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header */}
        <header className="flex justify-between items-center border-b border-white/10 pb-4">
          <div className="space-y-1">
            <h1 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${status === 'active' ? 'bg-blue-500 animate-ping' : 'bg-slate-700'}`} />
              Nexus <span className="text-blue-500">Live Trace</span>
            </h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-[0.3em]">Trace ID: {executionId}</p>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Link Status</p>
              <p className={`text-[10px] uppercase font-black ${status === 'active' ? 'text-green-500' : 'text-amber-500'}`}>
                {status}
              </p>
            </div>
            <Link to="/dashboard" className="text-[10px] font-black border border-white/10 px-4 py-2 hover:bg-white/5 transition-all uppercase tracking-widest">
              Exit Terminal
            </Link>
          </div>
        </header>

        {/* Console Window */}
        <div 
          ref={scrollRef}
          className="bg-black/60 border border-white/5 rounded-xl h-[65vh] overflow-y-auto p-6 space-y-2 relative shadow-2xl custom-scrollbar"
        >
          {status === "authenticating" ? (
            <div className="h-full flex items-center justify-center text-[10px] text-slate-600 uppercase tracking-[0.5em]">
              Verifying Security Clearance...
            </div>
          ) : events.length === 0 ? (
            <div className="h-full flex items-center justify-center text-[10px] text-slate-700 animate-pulse uppercase tracking-[0.5em]">
              Waiting for Neural Uplink...
            </div>
          ) : (
            events.map((ev) => (
              <div key={ev.id} className="text-[12px] flex gap-4 font-mono group hover:bg-white/[0.02] py-0.5 px-2 rounded transition-colors">
                <span className="text-slate-600 shrink-0 tabular-nums">{ev.timestamp}</span>
                <span className={`shrink-0 uppercase font-black tracking-tighter ${getEventColor(ev.type)}`}>
                  [{ev.type}]
                </span>
                <span className="text-slate-400 break-all">
                  {Object.entries(ev.body)
                    .filter(([key]) => key !== 'event')
                    .map(([key, val]) => `${key}=${typeof val === 'object' ? JSON.stringify(val) : val}`)
                    .join(" | ")}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Metrics Footer */}
        <footer className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-900/40 border border-white/5 p-4 rounded-xl">
            <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest mb-1">Packets</p>
            <p className="text-lg font-black text-white">{events.length}</p>
          </div>
          <div className="bg-slate-900/40 border border-white/5 p-4 rounded-xl">
            <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest mb-1">Link Speed</p>
            <p className="text-lg font-black text-green-500 uppercase">Synchronous</p>
          </div>
          <div className="bg-slate-900/40 border border-white/5 p-4 rounded-xl">
            <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest mb-1">Trace Mode</p>
            <p className="text-lg font-black text-blue-500 uppercase">Real-Time</p>
          </div>
        </footer>
      </div>
    </div>
  );
}