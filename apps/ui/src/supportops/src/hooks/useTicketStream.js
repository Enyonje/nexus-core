import { useEffect, useState } from "react";
import { SUPPORTOPS_API } from "../config/paths";
import { listenSse } from "../lib/sse";

const authHeaders = () => {
    const token = localStorage.getItem("token") || localStorage.getItem("authToken") || localStorage.getItem("access_token");
    const org = localStorage.getItem("activeOrgId");
    return {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(org ? { "X-Org-Id": org } : {}),
    };
};

export function useTicketStream() {
    const [tickets, setTickets] = useState([]);

    useEffect(() => {
        const controller = new AbortController();
        void listenSse(
            SUPPORTOPS_API.chat("/stream"),
            (event) => {
                const payload = event.data;
                if (payload?.type === "ticket" && payload.ticket) {
                    setTickets((previous) => [
                        payload.ticket,
                        ...previous.filter((ticket) => ticket.number !== payload.ticket.number),
                    ].slice(0, 20));
                }
            },
            controller.signal,
            authHeaders(),
        );
        return () => controller.abort();
    }, []);

    return tickets;
}

export default useTicketStream;
