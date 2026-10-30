// src/hooks/useAgentStream.js
import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../context/AuthContext";

/**
 * Custom hook for real-time SupportOps AI agent telemetry and streaming logs.
 * Supports Server-Sent Events (SSE) and WebSocket stream fallbacks.
 *
 * @param {Object} options
 * @param {string} options.ticketId - Optional specific ticket to stream logs for.
 * @param {string} options.agentId - Optional agent instance to monitor.
 * @param {boolean} options.autoConnect - Auto-start stream on mount (default: true).
 */
export function useAgentStream({ ticketId = null, agentId = null, autoConnect = true } = {}) {
    const { token } = useAuth();
    const [messages, setMessages] = useState([]);
    const [status, setStatus] = useState("disconnected"); // "disconnected" | "connecting" | "connected" | "error"
    const [telemetry, setTelemetry] = useState({
        activeAgents: 0,
        tokensPerSec: 0,
        currentSlaStatus: "healthy",
    });

    const eventSourceRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);

    // Clear log history
    const clearLogs = useCallback(() => {
        setMessages([]);
    }, []);

    // Connect to backend SSE / WebSockets stream
    const connect = useCallback(() => {
        if (!token) {
            setStatus("error");
            return;
        }

        setStatus("connecting");

        const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";
        const queryParams = new URLSearchParams({ token });
        if (ticketId) queryParams.append("ticketId", ticketId);
        if (agentId) queryParams.append("agentId", agentId);

        const streamUrl = `${baseUrl}/api/v1/supportops/stream?${queryParams.toString()}`;

        // Clean up prior stream instance if present
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
        }

        try {
            const es = new EventSource(streamUrl);
            eventSourceRef.current = es;

            es.onopen = () => {
                setStatus("connected");
            };

            // Listen for incoming AI thought tokens / streaming messages
            es.addEventListener("agent_message", (event) => {
                try {
                    const payload = JSON.parse(event.data);
                    setMessages((prev) => [...prev, payload]);
                } catch (err) {
                    console.error("Failed to parse agent_message payload:", err);
                }
            });

            // Listen for real-time telemetry updates (active agents, tokens/sec, SLA metrics)
            es.addEventListener("telemetry_update", (event) => {
                try {
                    const payload = JSON.parse(event.data);
                    setTelemetry((prev) => ({ ...prev, ...payload }));
                } catch (err) {
                    console.error("Failed to parse telemetry payload:", err);
                }
            });

            // Handle stream errors & automatic reconnection
            es.onerror = (err) => {
                console.error("SupportOps agent stream error:", err);
                setStatus("error");
                es.close();

                // Attempt reconnection after 5 seconds
                reconnectTimeoutRef.current = setTimeout(() => {
                    connect();
                }, 5000);
            };
        } catch (err) {
            console.error("Failed to initialize EventSource connection:", err);
            setStatus("error");
        }
    }, [token, ticketId, agentId]);

    // Disconnect stream helper
    const disconnect = useCallback(() => {
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
        }
        setStatus("disconnected");
    }, []);

    // Auto-connect lifecycle hook
    useEffect(() => {
        if (autoConnect && token) {
            connect();
        }

        return () => {
            disconnect();
        };
    }, [autoConnect, token, connect, disconnect]);

    return {
        messages,
        telemetry,
        status,
        connect,
        disconnect,
        clearLogs,
        isConnected: status === "connected",
    };
}

export default useAgentStream;