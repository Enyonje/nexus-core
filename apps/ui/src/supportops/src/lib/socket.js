let ws = null;

export function connectSocket(onEvent) {
  const token = localStorage.getItem("access_token");
  if (!token) return;

  // Backend WebSocket URL should be set in your Vite env file (.env)
  // Example: VITE_BACKEND_WS_URL=wss://supportops-ai.onrender.com/ws/tickets
  const backendUrl = import.meta.env.VITE_BACKEND_WS_URL;
  const url = `${backendUrl}?token=${encodeURIComponent(token)}`;

  ws = new WebSocket(url);

  ws.onopen = () => console.log("WS connected");
  ws.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data);
      onEvent?.(data);
    } catch {
      // Fallback for plain text messages
      onEvent?.({ type: "MESSAGE", payload: e.data });
    }
  };
  ws.onclose = () => {
    console.log("WS closed");
    // Optional: attempt reconnect
    // setTimeout(() => connectSocket(onEvent), 3000);
  };
  ws.onerror = (err) => console.error("WS error", err);
}

export function disconnectSocket() {
  try {
    ws?.close();
  } catch {}
  ws = null;
}

export function wsSend(payload) {
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}