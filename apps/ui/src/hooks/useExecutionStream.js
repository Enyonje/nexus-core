import { useEffect, useState } from "react";

export function useExecutionStream(executionId) {
  const [events, setEvents] = useState([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!executionId) return;

    const evtSource = new EventSource(
      `${process.env.REACT_APP_API_URL}/executions/${executionId}/stream`,
      { withCredentials: true }
    );

    evtSource.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        setEvents((prev) => [...prev, data]);

        if (data.event === "connected") {
          setConnected(true);
        }
      } catch (err) {
        console.error("Failed to parse SSE event:", err);
      }
    };

    evtSource.onerror = (err) => {
      console.error("SSE error:", err);
      evtSource.close();
      setConnected(false);
    };

    return () => {
      evtSource.close();
    };
  }, [executionId]);

  return { events, connected };
}