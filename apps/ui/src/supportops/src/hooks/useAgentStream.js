import { useEffect, useState } from "react";

export function useAgentStream(streamUrl) {
    const [events, setEvents] = useState([]);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        if (!streamUrl) return;

        const eventSource = new EventSource(streamUrl);

        eventSource.onopen = () => setIsConnected(true);

        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                setEvents((prev) => [data, ...prev.slice(0, 9)]); // Keep last 10 events
            } catch (err) {
                console.error("Failed to parse SSE payload:", err);
            }
        };

        eventSource.onerror = (err) => {
            console.error("SSE stream connection error:", err);
            setIsConnected(false);
            eventSource.close();
        };

        return () => {
            eventSource.close();
        };
    }, [streamUrl]);

    return { events, isConnected };
}