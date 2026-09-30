import { useEffect, useState } from "react";

export function useTicketStream() {
  const [tickets, setTickets] = useState([]);

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8000/ws/tickets");

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "ticket_update") {
        setTickets((prev) => [data, ...prev].slice(0, 20));
      }
    };

    return () => ws.close();
  }, []);

  return tickets;
}
