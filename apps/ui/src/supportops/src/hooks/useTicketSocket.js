import { useEffect, useRef } from "react";
import toast from "react-hot-toast";

const WS_URL = "wss://supportops-ai.onrender.com/ws/tickets";

export default function useTicketSocket({ onNewTicket }) {
  const socketRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    audioRef.current = new Audio("/notification.mp3");

    socketRef.current = new WebSocket(WS_URL);

    socketRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "NEW_TICKET") {
        // 🔔 Toast
        toast.custom((t) => (
          <div className="bg-slate-900 border border-blue-500/30 text-white px-6 py-4 rounded-xl shadow-xl flex gap-3 items-center">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            <div>
              <p className="font-bold text-sm">New Ticket</p>
              <p className="text-xs text-slate-400">
                {data.payload.subject}
              </p>
            </div>
          </div>
        ));

        // 🔊 Sound
        audioRef.current?.play().catch(() => {});

        // 🔴 Notify App
        onNewTicket(data.payload);
      }
    };

    socketRef.current.onerror = () => {
      console.error("WebSocket error");
    };

    return () => {
      socketRef.current?.close();
    };
  }, [onNewTicket]);
}
