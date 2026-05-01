import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthProvider";

export default function StreamPage() {
  const { executionId } = useParams();
  const { token } = useAuth();
  const [events, setEvents] = useState([]);
  const [status, setStatus] = useState("connecting");
  const scrollRef = useRef(null);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [events]);

  useEffect(() => {
    if (!token) {
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
        const newEvent = {
          type: payload.event || "TRACE",
          body: payload,
          timestamp: new Date().toLocaleTimeString(),
          id: window.crypto.randomUUID(), // ✅ use window.crypto
        };
        setEvents((prev) => [...prev, newEvent]);
      } catch (err) {
        console.error("Stream Parse Error:", err);
      }
    };

    sse.onerror = () => {
      console.warn("SSE connection error");
      setStatus("interrupted");
      // Let browser auto-retry instead of closing immediately
    };

    return () => sse.close();
  }, [executionId, token]);

  const getEventColor = (type) => {
    const t = type.toLowerCase();
    if (t.includes("fail") || t.includes("error")) return "text-red-400";
    if (t.includes("complete") || t.includes("success")) return "text-green-400";
    if (t.includes("connect")) return "text-blue-400";
    return "text-indigo-400";
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 p-8 font-mono">
      {/* ... keep your JSX as-is ... */}
    </div>
  );
}
