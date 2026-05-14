import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthProvider";

export default function Streams() {
  const { executionId } = useParams();
  const { token } = useAuth();
  const [events, setEvents] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [status, setStatus] = useState("connecting");
  const scrollRef = useRef(null);

  // Auto-scroll to bottom when events update
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [events, auditLogs]);

  // Stream execution events (SSE)
  useEffect(() => {
    if (!token) {
      setStatus("authenticating");
      return;
    }

    const url = `${import.meta.env.VITE_API_URL}/api/executions/${executionId}/stream?token=${token}`;
    const sse = new EventSource(url);

    sse.onopen = () => {
      console.log("Nexus Link: Synchronized");
      setStatus("active");
    };

    const handleEvent = (type) => (e) => {
      try {
        const payload = JSON.parse(e.data);
        const newEvent = {
          type,
          body: payload,
          timestamp: new Date().toLocaleTimeString(),
          id: window.crypto.randomUUID(),
        };
        setEvents((prev) => [...prev, newEvent]);
      } catch (err) {
        console.error("Stream Parse Error:", err);
      }
    };

    sse.addEventListener("execution_started", handleEvent("execution_started"));
    sse.addEventListener("execution_progress", handleEvent("execution_progress"));
    sse.addEventListener("execution_completed", handleEvent("execution_completed"));
    sse.addEventListener("execution_failed", handleEvent("execution_failed"));
    sse.addEventListener("execution_warning", handleEvent("execution_warning"));
    sse.addEventListener("sentinel_blocked", handleEvent("sentinel_blocked"));
    sse.addEventListener("execution_heartbeat", handleEvent("execution_heartbeat"));

    sse.onerror = () => {
      console.warn("SSE connection error");
      setStatus("interrupted");
    };

    return () => sse.close();
  }, [executionId, token]);

  // Fetch audit logs (REST)
  useEffect(() => {
    if (!token) return;
    const fetchAudit = async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/api/executions/${executionId}/audit`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const data = await res.json();
        setAuditLogs(data.logs || []);
      } catch (err) {
        setAuditLogs([]);
      }
    };
    fetchAudit();
  }, [executionId, token]);

  const getEventColor = (type) => {
    const t = type.toLowerCase();
    if (t.includes("fail") || t.includes("error")) return "text-red-400";
    if (t.includes("complete") || t.includes("success")) return "text-green-400";
    if (t.includes("start")) return "text-blue-400";
    if (t.includes("progress")) return "text-indigo-400";
    if (t.includes("heartbeat")) return "text-yellow-400";
    return "text-slate-400";
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 p-8 font-mono">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Execution Stream</h1>
        <Link
          to="/"
          className="text-blue-400 hover:underline text-sm border px-2 py-1 rounded"
        >
          Back to Home
        </Link>
      </div>
      <div
        ref={scrollRef}
        className="overflow-y-auto h-96 border border-slate-700 rounded p-4 bg-slate-900"
        tabIndex={0}
        aria-label="Event Stream"
      >
        <ul>
          {events.map((event) => (
            <li key={event.id} className={getEventColor(event.type)}>
              [{event.timestamp}] <span className="font-semibold">{event.type}</span>:{" "}
              <span className="break-all">{JSON.stringify(event.body)}</span>
            </li>
          ))}
        </ul>
        <hr className="my-4 border-slate-700" />
        <h2 className="text-lg font-bold mb-2">Audit Logs</h2>
        <ul>
          {auditLogs.length === 0 && (
            <li className="text-slate-500">No audit logs found.</li>
          )}
          {auditLogs.map((log) => (
            <li key={log.id} className="text-xs">
              [{new Date(log.created_at).toLocaleTimeString()}] <span className="font-semibold">{log.status}</span>:{" "}
              <span className="break-all">{log.meta}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-4 flex items-center gap-4">
        <span>
          Status:{" "}
          <span
            className={
              status === "active"
                ? "text-green-400"
                : status === "interrupted"
                ? "text-yellow-400"
                : "text-blue-400"
            }
          >
            {status}
          </span>
        </span>
        {status === "interrupted" && (
          <span className="text-yellow-400">Attempting to reconnect...</span>
        )}
        {status === "authenticating" && (
          <span className="text-red-400">Authentication required.</span>
        )}
      </div>
    </div>
  );
}