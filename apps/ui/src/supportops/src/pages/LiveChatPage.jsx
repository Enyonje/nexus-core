import React, { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { MessagesSquare, Send, CheckCircle2 } from "lucide-react";
import { SUPPORTOPS_API } from "../config/paths";

const headers = () => {
    const token = localStorage.getItem("authToken");
    const org = localStorage.getItem("activeOrgId");
    return { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(org ? { "X-Org-Id": org } : {}) };
};

async function call(method, url, body) {
    const res = await fetch(url, {
        method,
        headers: { ...headers(), ...(body ? { "Content-Type": "application/json" } : {}) },
        body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.message || `Request failed (${res.status})`);
    if (data === null) throw new Error("The server did not answer with JSON. Check that VITE_API_URL points at your API.");
    return data;
}

// fetch-based SSE so the Authorization header can be sent (EventSource cannot)
async function listen(url, onEvent, signal) {
    while (!signal.aborted) {
        try {
            const res = await fetch(url, { signal, headers: headers() });
            const reader = res.body.getReader();
            const dec = new TextDecoder();
            let buf = "";
            for (; ;) {
                const { done, value } = await reader.read();
                if (done) break;
                buf += dec.decode(value, { stream: true });
                const parts = buf.split("\n\n");
                buf = parts.pop();
                for (const p of parts) if (p.startsWith("data: ")) onEvent(JSON.parse(p.slice(6)));
            }
        } catch { /* reconnect below */ }
        if (!signal.aborted) await new Promise((r) => setTimeout(r, 3000));
    }
}

const ago = (d) => new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export default function LiveChatPage() {
    const [convs, setConvs] = useState([]);
    const [activeId, setActiveId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [draft, setDraft] = useState("");
    const [loading, setLoading] = useState(true);
    const bottom = useRef(null);
    const activeRef = useRef(null);
    activeRef.current = activeId;

    const loadList = useCallback(async () => {
        try { const r = await call("GET", SUPPORTOPS_API.chat("/conversations", { status: "open" })); setConvs(Array.isArray(r) ? r : []); }
        catch (err) { toast.error(err.message); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { loadList(); }, [loadList]);

    useEffect(() => {
        const controller = new AbortController();
        listen(SUPPORTOPS_API.chat("/stream"), (ev) => {
            if (ev.type === "conversation") loadList();
            if (ev.type === "message") {
                if (ev.conversationId === activeRef.current) {
                    setMessages((m) => (m.some((x) => x.id === ev.message.id) ? m : [...m, ev.message]));
                }
                loadList();
            }
        }, controller.signal);
        return () => controller.abort();
    }, [loadList]);

    useEffect(() => {
        if (!activeId) return;
        call("GET", SUPPORTOPS_API.chat(`/conversations/${activeId}/messages`)).then((m) => setMessages(Array.isArray(m) ? m : [])).catch((e) => toast.error(e.message));
    }, [activeId]);

    useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

    async function send(e) {
        e.preventDefault();
        const body = draft.trim();
        if (!body) return;
        setDraft("");
        try { await call("POST", SUPPORTOPS_API.chat(`/conversations/${activeId}/messages`), { body }); }
        catch (err) { toast.error(err.message); setDraft(body); }
    }

    async function close() {
        try {
            await call("POST", SUPPORTOPS_API.chat(`/conversations/${activeId}/close`));
            setActiveId(null); setMessages([]); loadList();
        } catch (err) { toast.error(err.message); }
    }

    const active = convs.find((c) => c.id === activeId);

    return (
        <div className="min-h-screen bg-[#030712] text-slate-100 px-4 sm:px-6 lg:px-8 py-8">
            <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight mb-6"><MessagesSquare className="h-6 w-6 text-cyan-400" />Live chat</h1>

            <div className="grid md:grid-cols-[320px_1fr] gap-4 h-[70vh]">
                <aside className="rounded-2xl bg-slate-900/40 border border-slate-800/80 overflow-y-auto">
                    {loading ? <p className="p-4 text-sm text-slate-400">Loading…</p>
                        : convs.length === 0 ? <p className="p-6 text-sm text-slate-500 text-center">No open chats. New visitor chats appear here instantly.</p>
                            : convs.map((c) => (
                                <button key={c.id} type="button" onClick={() => setActiveId(c.id)}
                                    className={`w-full text-left px-4 py-3 border-b border-slate-800/80 hover:bg-white/5 ${c.id === activeId ? "bg-blue-600/10" : ""}`}>
                                    <div className="flex justify-between text-sm"><span className="font-medium truncate">{c.name}</span><span className="text-[11px] text-slate-500">{ago(c.lastMessageAt)}</span></div>
                                    <p className="text-xs text-slate-400 truncate">{c.lastMessage}</p>
                                </button>
                            ))}
                </aside>

                <section className="rounded-2xl bg-slate-900/40 border border-slate-800/80 flex flex-col overflow-hidden">
                    {!active ? (
                        <div className="flex-1 flex items-center justify-center text-sm text-slate-500">Select a chat to reply</div>
                    ) : (
                        <>
                            <header className="flex items-center justify-between px-5 py-3 border-b border-slate-800/80">
                                <span className="font-semibold text-sm">{active.name}</span>
                                <button type="button" onClick={close} className="flex items-center gap-1 text-xs text-emerald-400 hover:underline"><CheckCircle2 className="h-3.5 w-3.5" />Resolve</button>
                            </header>
                            <div className="flex-1 overflow-y-auto p-5 space-y-2">
                                {messages.map((m) => (
                                    <div key={m.id} className={`flex ${m.sender === "agent" ? "justify-end" : "justify-start"}`}>
                                        <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap break-words ${m.sender === "agent" ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-100"}`}>{m.body}</div>
                                    </div>
                                ))}
                                <div ref={bottom} />
                            </div>
                            <form onSubmit={send} className="flex gap-2 p-3 border-t border-slate-800/80">
                                <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Type a reply…" maxLength={2000}
                                    className="flex-1 px-3 py-2 rounded-lg border border-white/10 bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600" />
                                <button type="submit" aria-label="Send" className="px-4 rounded-lg bg-blue-600 hover:bg-blue-500"><Send className="h-4 w-4" /></button>
                            </form>
                        </>
                    )}
                </section>
            </div>
        </div>
    );
}