import { useEffect, useState } from "react";

export function useExecutionStream(executionId) {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    if (!executionId) return;

    const source = new EventSource(`/stream/${executionId}`);

    source.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        setEvents((prev) => [...prev, data]);
      } catch (err) {
        console.error("Failed to parse SSE message:", err);
      }
    };

    source.onerror = (err) => {
      console.error("SSE connection error:", err);
      source.close();
    };

    return () => {
      source.close();
    };
  }, [executionId]);

  return events;
}