// Compatibility facade for older callers. SupportOps uses authenticated SSE;
// bearer tokens are never placed in a WebSocket query string.
import { SUPPORTOPS_API } from "../config/paths";
import { listenSse } from "./sse";

let controller = null;

export function connectSocket(onEvent) {
    disconnectSocket();
    const token = localStorage.getItem("token") || localStorage.getItem("authToken") || localStorage.getItem("access_token");
    if (!token) return false;

    controller = new AbortController();
    void listenSse(
        SUPPORTOPS_API.chat("/stream"),
        (event) => onEvent?.(event.data),
        controller.signal,
        {
            Authorization: `Bearer ${token}`,
            ...(localStorage.getItem("activeOrgId")
                ? { "X-Org-Id": localStorage.getItem("activeOrgId") }
                : {}),
        },
    );
    return true;
}

export function disconnectSocket() {
    controller?.abort();
    controller = null;
}

// SSE is server-to-client only. Mutations must use the authenticated REST API.
export function wsSend() {
    return false;
}
