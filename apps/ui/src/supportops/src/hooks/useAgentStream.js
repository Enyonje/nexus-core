import { useCallback, useEffect, useRef, useState } from "react";
import { API_ENDPOINTS } from "../config/paths";
import { listenSse } from "../lib/sse";

const readToken = () =>
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("access_token");

function resolveOptions(input, extra = {}) {
    if (typeof input === "string") return { ...extra, url: input };
    return { ...(input || {}), ...extra };
}

/**
 * Authenticated Nexus/SupportOps activity stream.
 * Accepts either useAgentStream(url, { enabled }) or useAgentStream({ url, enabled }).
 * Bearer credentials are sent in headers, never in query strings.
 */
export function useAgentStream(input = {}, extra = {}) {
    const options = resolveOptions(input, extra);
    const url = options.url || API_ENDPOINTS.activityStream;
    const enabled = options.enabled ?? options.autoConnect ?? true;

    const [events, setEvents] = useState([]);
    const [status, setStatus] = useState("disconnected");
    const [telemetry, setTelemetry] = useState({
        activeAgents: 0,
        tokensPerSec: 0,
        currentSlaStatus: "healthy",
    });
    const controllerRef = useRef(null);

    const disconnect = useCallback(() => {
        controllerRef.current?.abort();
        controllerRef.current = null;
        setStatus("disconnected");
    }, []);

    const connect = useCallback(() => {
        controllerRef.current?.abort();
        const token = readToken();
        if (!token) {
            setStatus("error");
            return;
        }

        const controller = new AbortController();
        controllerRef.current = controller;
        setStatus("connecting");

        void listenSse(
            url,
            (event) => {
                const payload = event.data;
                setEvents((previous) => [...previous, {
                    ...(payload && typeof payload === "object" ? payload : { description: String(payload ?? "") }),
                    id: event.id || `${Date.now()}-${previous.length}`,
                    eventType: event.type,
                    receivedAt: new Date().toISOString(),
                }].slice(-100));
                if (event.type === "telemetry_update" && payload && typeof payload === "object") {
                    setTelemetry((previous) => ({ ...previous, ...payload }));
                }
            },
            controller.signal,
            { Authorization: `Bearer ${token}`, Accept: "text/event-stream" },
            setStatus,
        );
    }, [url]);

    useEffect(() => {
        if (enabled) connect();
        else disconnect();
        return disconnect;
    }, [enabled, connect, disconnect]);

    return {
        events,
        messages: events,
        telemetry,
        status,
        connect,
        disconnect,
        clearLogs: () => setEvents([]),
        isConnected: status === "connected",
    };
}

export default useAgentStream;
