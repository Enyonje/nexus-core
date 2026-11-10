import { useEffect, useRef } from "react";
import toast from "react-hot-toast";
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

export default function useTicketSocket({ onNewTicket } = {}) {
    const callbackRef = useRef(onNewTicket);
    callbackRef.current = onNewTicket;

    useEffect(() => {
        const controller = new AbortController();
        void listenSse(
            SUPPORTOPS_API.chat("/stream"),
            (event) => {
                const payload = event.data;
                if (payload?.type !== "ticket" || !payload.ticket) return;
                if (payload.event === "ticket_created") {
                    toast.success(`New ticket: ${payload.ticket.subject || payload.ticket.id}`);
                    callbackRef.current?.(payload.ticket);
                }
            },
            controller.signal,
            authHeaders(),
        );
        return () => controller.abort();
    }, []);
}
