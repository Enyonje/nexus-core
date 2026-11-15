// src/execution/tools.js
// The agent's tool catalog. Add your own with registerTool().
import { assertPublicUrl, withTimeout } from "./safety.js";

const registry = new Map();

/**
 * registerTool({
 *   name, description,
 *   parameters: JSON Schema object,
 *   risk: "low" | "medium" | "high" | (args) => risk,   // "high" triggers the approval flow
 *   timeoutMs?, label?,
 *   handler: async (args, { signal, executionId }) => anyJsonSerializable
 * })
 */
export function registerTool(def) {
    if (!def?.name || typeof def.handler !== "function") throw new Error("A tool needs a name and a handler");
    registry.set(def.name, { risk: "low", parameters: { type: "object", properties: {} }, ...def });
}

export const getTool = (name) => registry.get(name);
export const listToolNames = () => [...registry.keys()];
export const riskOf = (def, args) => (typeof def.risk === "function" ? def.risk(args) : def.risk);

export function toolSchemas(allowed) {
    return [...registry.values()]
        .filter((t) => !allowed || allowed.has(t.name))
        .map((t) => ({ type: "function", function: { name: t.name, description: t.description, parameters: t.parameters } }));
}

// Light validation so a malformed call goes back to the model instead of crashing a step
export function validateArgs(schema = {}, args) {
    if (!args || typeof args !== "object" || Array.isArray(args)) return "Arguments must be a JSON object";
    for (const k of schema.required || []) {
        if (args[k] === undefined || args[k] === null || args[k] === "") return `Missing required argument '${k}'`;
    }
    for (const [k, def] of Object.entries(schema.properties || {})) {
        if (args[k] === undefined) continue;
        const t = Array.isArray(args[k]) ? "array" : typeof args[k];
        if (def.type && def.type !== t && !(def.type === "integer" && t === "number")) return `Argument '${k}' must be of type ${def.type}`;
    }
    return null;
}

const httpError = (res) => Object.assign(new Error(`HTTP ${res.status}`), { status: res.status });
const cap = (s, n) => (s.length > n ? s.slice(0, n) : s);

/* ---------------- Built-in tools ---------------- */

registerTool({
    name: "fetch_page",
    description: "Download a public web page and return its readable text (up to about 8000 characters).",
    parameters: { type: "object", properties: { url: { type: "string", description: "Full http(s) URL" } }, required: ["url"] },
    risk: "low",
    async handler({ url }, { signal } = {}) {
        const res = await fetch(await assertPublicUrl(url), { headers: { "User-Agent": "NexusCore-Agent/1.0" }, redirect: "error", signal: withTimeout(signal) });
        if (!res.ok) throw httpError(res);
        if (Number(res.headers.get("content-length")) > 2_000_000) throw Object.assign(new Error("Page is too large"), { retryable: false });
        const html = await res.text();
        const text = html
            .replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, " ")
            .replace(/<[^>]+>/g, " ")
            .replace(/&nbsp;/g, " ")
            .replace(/\s+/g, " ")
            .trim();
        return { url, status: res.status, text: cap(text, 8000), truncated: text.length > 8000 };
    },
});

registerTool({
    name: "http_request",
    description: "Call an HTTP API. GET is read-only. POST, PUT, PATCH and DELETE change data and need the user's approval.",
    parameters: {
        type: "object",
        properties: {
            url: { type: "string" },
            method: { type: "string", description: "GET, POST, PUT, PATCH or DELETE. Defaults to GET." },
            headers: { type: "object", description: "Optional request headers" },
            body: { type: "object", description: "Optional JSON body" },
        },
        required: ["url"],
    },
    risk: (a) => (String(a?.method || "GET").toUpperCase() === "GET" ? "low" : "high"),
    async handler({ url, method = "GET", headers, body }, { signal } = {}) {
        const verb = String(method).toUpperCase();
        const res = await fetch(await assertPublicUrl(url), {
            method: verb,
            headers: { "User-Agent": "NexusCore-Agent/1.0", ...(body ? { "Content-Type": "application/json" } : {}), ...(headers || {}) },
            body: verb === "GET" || verb === "HEAD" || !body ? undefined : JSON.stringify(body),
            redirect: "error",
            signal: withTimeout(signal),
        });
        const text = cap(await res.text(), 12000);
        if (!res.ok) throw httpError(res);
        let data = text;
        try { data = JSON.parse(text); } catch { /* keep text */ }
        return { status: res.status, data };
    },
});

registerTool({
    name: "current_time",
    description: "Get the current date and time in UTC.",
    parameters: { type: "object", properties: {} },
    risk: "low",
    async handler() {
        return { utc: new Date().toISOString() };
    },
});

// Slack-compatible incoming webhook. The URL comes from the environment, never from the model.
if (process.env.NOTIFY_WEBHOOK_URL) {
    registerTool({
        name: "send_notification",
        description: "Send a message to the team's notification channel. Always needs the user's approval.",
        parameters: { type: "object", properties: { text: { type: "string", description: "Message to send" } }, required: ["text"] },
        risk: "high",
        async handler({ text }, { signal } = {}) {
            const res = await fetch(process.env.NOTIFY_WEBHOOK_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: cap(String(text), 3000) }),
                signal: withTimeout(signal),
            });
            if (!res.ok) throw httpError(res);
            return { sent: true };
        },
    });
}