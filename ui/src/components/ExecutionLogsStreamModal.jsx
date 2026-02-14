import React, { useEffect, useState, useRef } from "react";

function ExecutionLogsStreamModal({ executionId, onClose }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null); // reference to scroll target

  // Fetch static logs first
  useEffect(() => {
    async function fetchLogs() {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(
          `https://nexus-core-a0px.onrender.com/executions/${executionId}/logs`,
          {
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );
        const data = await res.json();
        const staticLogs = (data.logs || []).map((log) => ({
          ...log,
          source: "static",
        }));
        setLogs(staticLogs);
      } catch (err) {
        console.error("Failed to fetch logs:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchLogs();
  }, [executionId]);

  // Subscribe to SSE for live updates
  useEffect(() => {
    const eventSource = new EventSource(
      `https://nexus-core-a0px.onrender.com/executions/${executionId}/stream`,
      { withCredentials: true }
    );

    eventSource.onmessage = (e) => {
      try {
        const evt = JSON.parse(e.data);
        setLogs((prev) => [
          ...prev,
          {
            id: `evt-${Date.now()}`,
            name: evt.step || evt.event,
            status: evt.status || evt.event,
            output: evt.result,
            error: evt.error,
            started_at: new Date().toISOString(),
            finished_at: evt.status === "completed" ? new Date().toISOString() : null,
            source: "live",
          },
        ]);
      } catch (err) {
        console.error("Failed to parse SSE event:", err);
      }
    };

    eventSource.onerror = (err) => {
      console.error("SSE connection error:", err);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [executionId]);

  // Auto-scroll to bottom whenever logs change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <div className="modal">
      <div className="modal-header">
        <h2>Execution Logs (Live + Historical)</h2>
        <button onClick={onClose}>✖</button>
      </div>
      <div className="modal-body" style={{ maxHeight: "400px", overflowY: "auto" }}>
        {loading ? (
          <p>Loading logs...</p>
        ) : logs.length === 0 ? (
          <p>No logs yet.</p>
        ) : (
          <ul>
            {logs.map((log) => (
              <li
                key={log.id}
                style={{
                  backgroundColor: log.source === "live" ? "#e6f7ff" : "#f9f9f9",
                  borderLeft: log.source === "live" ? "4px solid #1890ff" : "4px solid #ccc",
                  padding: "8px",
                  marginBottom: "6px",
                }}
              >
                <strong>{log.name}</strong> — {log.status}
                {log.source === "live" && (
                  <span style={{ marginLeft: "8px", color: "#1890ff" }}>[LIVE]</span>
                )}
                {log.output && (
                  <pre style={{ background: "#fff", padding: "4px" }}>
                    {JSON.stringify(log.output, null, 2)}
                  </pre>
                )}
                {log.error && (
                  <span style={{ color: "red" }}>Error: {log.error}</span>
                )}
                <small style={{ display: "block", marginTop: "4px", color: "#666" }}>
                  Started: {new Date(log.started_at).toLocaleString()} | Finished:{" "}
                  {log.finished_at ? new Date(log.finished_at).toLocaleString() : "—"}
                </small>
              </li>
            ))}
            {/* Invisible element to scroll into view */}
            <div ref={bottomRef}></div>
          </ul>
        )}
      </div>
    </div>
  );
}

export default ExecutionLogsStreamModal;