import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { formatDate } from "../lib/utils";

export default function StreamPage() {
  const { executionId } = useParams();
  const [events, setEvents] = useState([]);
  const [status, setStatus] = useState("connecting");
  const [meta, setMeta] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    // Establish SSE Connection to your backend route
    // Note: EventSource doesn't support custom headers natively for Auth. 
    // If your requireAuth checks cookies, this works. If it's a Bearer token, 
    // you may need a library like 'event-source-polyfill'.
    const sse = new EventSource(`${import.meta.env.VITE_API_URL}/stream/${executionId}`, {
      withCredentials: true,
    });

    sse.onopen = () => setStatus("active");
    
    sse.onmessage = (e) => {
      const payload = JSON.parse(e.data);
      
      // Handle different event types from your publishEvent backend
      if (payload.event === "execution_created" || payload.event === "execution_updated") {
        setEvents((prev) => [payload, ...prev].slice(0, 50)); // Keep last 50
        setMeta(payload.data);
      }
      
      // Auto-scroll logic if needed
      if (scrollRef.current) {
        scrollRef.current.scrollTop = 0;
      }
    };

    sse.onerror = () => {
      setStatus("interrupted");
      sse.close();
    };

    return () => sse.close();
  }, [executionId]);

  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col font-sans overflow-hidden">
      {/* HUD Navigation */}
      <nav className="border-b border-white/5 bg-slate-900/40 backdrop-blur-2xl px-6 py-4 flex justify-between items-center z-50">
        <div className="flex items-center gap-6">
          <Link to="/executions" className="group flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-blue-400 transition-colors">
            <span className="group-hover:-translate-x-1 transition-transform">←</span> Back to Archive
          </Link>
          <div className="h-4 w-px bg-white/10" />
          <div>
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-white">Neural Stream</h2>
            <p className="text-[9px] font-mono text-slate-500">{executionId?.toUpperCase()}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${
            status === 'active' ? 'border-green-500/20 bg-green-500/5 text-green-400' : 'border-red-500/20 bg-red-500/5 text-red-400'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${status === 'active' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="text-[9px] font-black uppercase tracking-widest">{status}</span>
          </div>
        </div>
      </nav>

      <div className="flex-1 grid lg:grid-cols-12 overflow-hidden">
        {/* SIDEBAR: ARCHITECT PANEL */}
        <aside className="lg:col-span-4 border-r border-white/5 bg-slate-900/20 p-8 space-y-8 overflow-y-auto">
          <section className="space-y-4">
            <label className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em]">Current Protocol</label>
            <div className="p-6 rounded-[2rem] bg-gradient-to-br from-slate-800/40 to-slate-900/40 border border-white/5">
              <h3 className="text-xl font-black tracking-tight mb-2">{meta?.action || "Initializing..."}</h3>
              <p className="text-xs text-slate-400 leading-relaxed font-medium">
                {meta?.details || "Waiting for signal from objective nodes..."}
              </p>
            </div>
          </section>

          <section className="space-y-4 pt-8 border-t border-white/5">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">System Telemetry</label>
            <div className="grid grid-cols-2 gap-4">
              <TelemetryCard label="Latency" value="24ms" color="text-green-400" />
              <TelemetryCard label="Node Count" value="12" color="text-blue-400" />
              <TelemetryCard label="Integrity" value="99.9%" color="text-indigo-400" />
              <TelemetryCard label="Security" value="L5" color="text-purple-400" />
            </div>
          </section>
        </aside>

        {/* MAIN: THE NEURAL TRACE */}
        <main className="lg:col-span-8 relative flex flex-col bg-black/20">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_#1e293b_0%,_transparent_40%)] opacity-20 pointer-events-none" />
          
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-8 space-y-4 custom-scrollbar"
          >
            <AnimatePresence initial={false}>
              {events.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <p className="text-[10px] font-mono text-slate-600 uppercase tracking-[0.4em] animate-pulse">Awaiting handshake...</p>
                </div>
              ) : (
                events.map((event, idx) => (
                  <motion.div
                    key={event.data?.id || idx}
                    initial={{ opacity: 0, x: 20, filter: "blur(10px)" }}
                    animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                    className="flex gap-6 group"
                  >
                    <div className="flex flex-col items-center">
                      <div className="w-px h-full bg-gradient-to-b from-blue-500/50 to-transparent" />
                      <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)] my-2" />
                    </div>
                    
                    <div className="flex-1 pb-8">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-[9px] font-mono text-slate-500">{formatDate(event.data?.created_at)}</span>
                        <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[8px] font-black uppercase tracking-widest border border-blue-500/20">
                          {event.event}
                        </span>
                      </div>
                      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 group-hover:bg-white/[0.04] transition-colors">
                        <p className="text-sm font-bold text-slate-200 mb-1">{event.data?.action}</p>
                        <p className="text-xs text-slate-500 font-mono leading-relaxed">
                          {typeof event.data?.details === 'object' 
                            ? JSON.stringify(event.data?.details) 
                            : event.data?.details}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>

          {/* INPUT BAR (Visual Only or For Commands) */}
          <div className="p-6 border-t border-white/5 bg-slate-900/40 backdrop-blur-md">
            <div className="max-w-3xl mx-auto relative">
              <input 
                disabled
                placeholder="Swarm is operating autonomously..." 
                className="w-full bg-black/40 border border-white/10 rounded-xl px-6 py-4 text-xs font-mono text-slate-400 outline-none focus:border-blue-500/50 transition-all"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function TelemetryCard({ label, value, color }) {
  return (
    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
      <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1">{label}</p>
      <p className={`text-sm font-black font-mono ${color}`}>{value}</p>
    </div>
  );
}