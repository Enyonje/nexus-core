import React, { useEffect, useRef, useState } from "react";
import { useToast } from "./ToastContext.jsx";
import LoadingSpinner from "./LoadingSpinner.jsx";

export default function ExecutionStreamModal({ isOpen, onClose, executionId }) {
  const { addToast } = useToast();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [connected, setConnected] = useState(false);
  const [paused, setPaused] = useState(false);
  const evtRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    if (!executionId) {
      setError("Missing execution id");
      return;
    }

    let mounted = true;
    setEvents([]);
    setLoading(true);
    setError(null);
    setPaused(false);

    const token = localStorage.getItem("authToken");
    if (!token) {
      setError("Not authenticated");
      setLoading(false);
      return;
    }

    try {
      const src = new EventSource(
        `${import.meta.env.VITE_API_URL}/api/executions/${executionId}/stream?token=${encodeURIComponent(token)}`
      );
      evtRef.current = src;

      src.onopen = () => {
        if (!mounted) return;
        setConnected(true);
        setLoading(false);
      };

      src.onmessage = (e) => {
        if (!mounted || paused) return;
        try {
          const d = JSON.parse(e.data);
          const item = {
            ts: new Date().toISOString(),
            event: d.event ?? d.type ?? "message",
            payload: d,
          };
          setEvents((prev) => [...prev, item]);
        } catch (err) {
          setEvents((prev) => [...prev, { ts: new Date().toISOString(), event: "raw", payload: e.data }]);
        }
      };

      src.onerror = (err) => {
        console.warn("SSE error", err);
        if (!mounted) return;
        setConnected(false);
        // leave source open; some browsers auto-retry. show lightweight toast once.
        addToast("Stream connection lost (will retry)", "error");
      };
    } catch (err) {
      setError("Failed to open stream");
      setLoading(false);
      addToast("Unable to open stream", "error");
    }

    return () => {
      mounted = false;
      try { evtRef.current?.close(); } catch (e) {}
      evtRef.current = null;
      setConnected(false);
    };
  }, [isOpen, executionId, addToast, paused]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [events.length]);

  const clearEvents = () => setEvents([]);
  const togglePause = () => {
    // toggling pause will cause useEffect to re-run and reconnect
    setPaused((p) => !p);
    if (!paused) {
      // paused -> true: close connection
      try { evtRef.current?.close(); } catch (e) {}
      evtRef.current = null;
      setConnected(false);
      addToast("Stream paused", "info");
    } else {
      addToast("Resuming stream...", "success");
    }
  };

  const copyEvents = async () => {
    try {
      const txt = events.map((e) => `${e.ts} [${e.event}] ${typeof e.payload === "string" ? e.payload : JSON.stringify(e.payload)}`).join("\n");
      await navigator.clipboard.writeText(txt);
      addToast("Stream copied to clipboard", "success");
    } catch {
      addToast("Copy failed", "error");
    }
  };

  const downloadEvents = () => {
    try {
      const blob = new Blob([events.map(e => JSON.stringify(e)).join("\n")], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `execution_stream_${executionId?.slice(0,8) || "stream"}.log`;
      a.click();
      URL.revokeObjectURL(url);
      addToast("Download started", "success");
    } catch {
      addToast("Download failed", "error");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative max-w-4xl w-full mx-4 bg-[#0b1220] border border-white/5 rounded-2xl shadow-lg overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <div>
            <h3 className="text-sm font-bold">Execution Stream</h3>
            <p className="text-xs text-slate-400">{executionId || "—"}</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-xs text-slate-400 mr-2">
              {loading ? <span>Connecting...</span> : connected ? <span className="text-green-400">Live</span> : <span className="text-yellow-400">Disconnected</span>}
            </div>
            <button onClick={togglePause} className="text-xs px-3 py-1 bg-slate-800 rounded hover:bg-slate-700">
              {paused ? "Resume" : "Pause"}
            </button>
            <button onClick={clearEvents} className="text-xs px-3 py-1 bg-slate-800 rounded hover:bg-slate-700">Clear</button>
            <button onClick={copyEvents} className="text-xs px-3 py-1 bg-slate-800 rounded hover:bg-slate-700">Copy</button>
            <button onClick={downloadEvents} className="text-xs px-3 py-1 bg-slate-800 rounded hover:bg-slate-700">Download</button>
            <button onClick={onClose} aria-label="Close stream" className="text-xs px-3 py-1 bg-red-600 rounded hover:bg-red-500">Close</button>
          </div>
        </div>

        <div className="p-4" style={{ minHeight: 200, maxHeight: "70vh" }}>
          {loading ? (
            <div className="flex items-center justify-center">
              <LoadingSpinner label="Connecting to execution stream..." />
            </div>
          ) : error ? (
            <div className="text-red-400 text-sm">{error}</div>
          ) : (
            <div ref={containerRef} className="overflow-auto bg-black/10 rounded p-3 font-mono text-xs text-slate-300" style={{ maxHeight: "62vh" }}>
              {events.length === 0 ? (
                <div className="text-slate-500">No stream events yet.</div>
              ) : (
                events.map((ev, i) => (
                  <div key={i} className="mb-2">
                    <div className="text-[10px] text-slate-500">{ev.ts} • <span className="uppercase font-black">{ev.event}</span></div>
                    <pre className="whitespace-pre-wrap break-words text-[12px] mt-1">{typeof ev.payload === "string" ? ev.payload : JSON.stringify(ev.payload, null, 2)}</pre>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}