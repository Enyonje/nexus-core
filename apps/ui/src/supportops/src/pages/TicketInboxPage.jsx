import React, { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Inbox, Send, CheckCircle2, UserCheck, StickyNote, Clock } from "lucide-react";
import { SUPPORTOPS_API } from "../config/paths";

const authHeaders = () => {
    const token = localStorage.getItem("authToken");
    const org = localStorage.getItem("activeOrgId");
    return { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(org ? { "X-Org-Id": org } : {}) };
};

async function call(method, url, body) {
    const res = await fetch(url, {
        method,
        headers: { ...authHeaders(), ...(body ? { "Content-Type": "application/json" } : {}) },
        body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || `Request failed (${res.status})`);
    return data;
}

// fetch-based SSE so the Authorization header can be sent
async function listen(url, onEvent, signal) {
    while (!signal.aborted) {
        try {
            const res = await fetch(url, { signal, headers: authHeaders() });
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
        } catch { /* reconnect */ }
        if (!signal.aborted) await new Promise((r) => setTimeout(r, 3000));
    }
}

const CHANNEL = { whatsapp: "WhatsApp", voice: "Phone", email: "Email", sms: "SMS", web: "Web chat", social: "Social" };
const FILTERS = [["open", "Open"], ["pending", "Waiting"], ["solved", "Solved"], ["all", "All"]];

function Sla({ due, status }) {
    if (!due || status === "solved" || status === "closed") return null;
    const mins = Math.round((new Date(due) - Date.now()) / 60000);
    const cls = mins < 0 ? "text-red-300" : mins <= 60 ? "text-amber-300" : "text-slate-400";
    return <span className={`inline-flex items-center gap-1 text-[11px] ${cls}`}><Clock className="h-3 w-3" />{mins < 0 ? `Breached ${-mins}m` : mins < 120 ? `${mins}m left` : `${Math.round(mins / 60)}h left`}</span>;
}

export default function TicketInboxPage() {
    const [filter, setFilter] = useState("open");
    const [tickets, setTickets] = useState([]);
    const [activeNo, setActiveNo] = useState(null);
    const [detail, setDetail] = useState(null);
    const [mode, setMode] = useState("reply"); // reply | note
    const [draft, setDraft] = useState("");
    const [busy, setBusy] = useState(false);
    const bottom = useRef(null);
    const ref = useRef({});
    ref.current = { filter, activeNo };

    const loadList = useCallback(async () => {
        try { setTickets(await call("GET", SUPPORTOPS_API.tickets("", { status: ref.current.filter, limit: 50 }))); }
        catch (e) { toast.error(e.message); }
    }, []);
    const loadDetail = useCallback(async (no) => {
        try { setDetail(await call("GET", SUPPORTOPS_API.tickets(`/${no}`))); } catch (e) { toast.error(e.message); }
    }, []);

    useEffect(() => { loadList(); }, [filter, loadList]);
    useEffect(() => { if (activeNo) loadDetail(activeNo); else setDetail(null); }, [activeNo, loadDetail]);
    useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth" }); }, [detail?.messages?.length]);

    useEffect(() => {
        const c = new AbortController();
        listen(SUPPORTOPS_API.chat("/stream"), (ev) => {
            if (ev.type !== "ticket") return;
            loadList();
            if (ev.ticket?.number === ref.current.activeNo) loadDetail(ev.ticket.number);
        }, c.signal);
        return () => c.abort();
    }, [loadList, loadDetail]);

    const canReply = Boolean(detail) && detail.channel !== "voice" && detail.status !== "closed";

    async function submit(e) {
        e.preventDefault();
        const body = draft.trim();
        if (!body || busy) return;
        setBusy(true);
        try {
            await call("POST", SUPPORTOPS_API.tickets(`/${activeNo}/${canReply ? mode : "note"}`), { body });
            setDraft("");
            await loadDetail(activeNo);
            loadList();
        } catch (err) { toast.error(err.message); } // includes "24 hours" and "not connected" explanations
        finally { setBusy(false); }
    }

    async function patch(data, okText) {
        try { await call("PATCH", SUPPORTOPS_API.tickets(`/${activeNo}`), data); toast.success(okText); await loadDetail(activeNo); loadList(); }
        catch (err) { toast.error(err.message); }
    }


    return (
        <div className="min-h-screen bg-[#030712] text-slate-100 px-4 sm:px-6 lg:px-8 py-8">
            <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight mb-4"><Inbox className="h-6 w-6 text-cyan-400" />Tickets</h1>
            <div className="flex gap-2 mb-4">
                {FILTERS.map(([k, label]) => (
                    <button key={k} type="button" onClick={() => setFilter(k)}
                        className={`px-3 py-1.5 text-xs rounded-lg ${filter === k ? "bg-blue-600 text-white" : "bg-slate-900 text-slate-400 hover:text-white"}`}>{label}</button>
                ))}
            </div>

            <div className="grid md:grid-cols-[340px_1fr] gap-4 h-[70vh]">
                <aside className="rounded-2xl bg-slate-900/40 border border-slate-800/80 overflow-y-auto">
                    {tickets.length === 0 ? <p className="p-6 text-sm text-slate-500 text-center">Nothing here. New messages from every channel appear instantly.</p>
                        : tickets.map((t) => (
                            <button key={t.id} type="button" onClick={() => setActiveNo(t.number)}
                                className={`w-full text-left px-4 py-3 border-b border-slate-800/80 hover:bg-white/5 ${t.number === activeNo ? "bg-blue-600/10" : ""}`}>
                                <div className="flex justify-between text-[11px] text-slate-500"><span>{t.id} · {CHANNEL[t.channel] ?? t.channel}</span><Sla due={t.slaDueAt} status={t.status} /></div>
                                <p className="text-sm text-slate-100 truncate">{t.subject}</p>
                                <p className="text-xs text-slate-500 truncate">{t.customer}</p>
                            </button>
                        ))}
                </aside>

                <section className="rounded-2xl bg-slate-900/40 border border-slate-800/80 flex flex-col overflow-hidden">
                    {!detail ? <div className="flex-1 flex items-center justify-center text-sm text-slate-500">Select a ticket</div> : (
                        <>
                            <header className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 border-b border-slate-800/80">
                                <div>
                                    <p className="text-sm font-semibold">{detail.id} · {detail.subject}</p>
                                    <p className="text-xs text-slate-500">{detail.customer} · {CHANNEL[detail.channel]} · {detail.priority} · {detail.status}</p>
                                </div>
                                <div className="flex gap-2 text-xs">
                                    <button type="button" onClick={() => patch({ assignToMe: true }, "Assigned to you")} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-700 hover:bg-white/5"><UserCheck className="h-3.5 w-3.5" />Assign to me</button>
                                    <button type="button" onClick={() => patch({ status: "solved" }, "Ticket solved")} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10"><CheckCircle2 className="h-3.5 w-3.5" />Resolve</button>
                                </div>
                            </header>

                            <div className="flex-1 overflow-y-auto p-5 space-y-2">
                                {detail.messages.map((m) => (
                                    <div key={m.id} className={`flex ${m.direction === "in" ? "justify-start" : "justify-end"}`}>
                                        <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap break-words ${m.direction === "in" ? "bg-slate-800" : m.direction === "note" ? "bg-amber-500/10 border border-amber-500/30 text-amber-100" : "bg-blue-600 text-white"}`}>
                                            {m.direction === "note" && <span className="block text-[10px] uppercase opacity-70 mb-0.5">Internal note</span>}{m.body}
                                        </div>
                                    </div>
                                ))}
                                <div ref={bottom} />
                            </div>

                            {detail.channel === "voice" ? (
                                <p className="px-5 py-3 text-xs text-amber-200 border-t border-slate-800/80">Phone tickets can't be answered in writing. Call the customer back, then add a note and resolve.</p>
                            ) : null}
                            <form onSubmit={submit} className="p-3 border-t border-slate-800/80 space-y-2">
                                <div className="flex gap-2 text-xs">
                                    {canReply && <button type="button" onClick={() => setMode("reply")} className={`px-2.5 py-1 rounded-md ${mode === "reply" ? "bg-blue-600" : "bg-slate-800 text-slate-400"}`}>Reply to customer</button>}
                                    <button type="button" onClick={() => setMode("note")} className={`flex items-center gap-1 px-2.5 py-1 rounded-md ${mode === "note" || !canReply ? "bg-amber-600/80" : "bg-slate-800 text-slate-400"}`}><StickyNote className="h-3 w-3" />Internal note</button>
                                </div>
                                <div className="flex gap-2">
                                    <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={2} maxLength={4000}
                                        placeholder={mode === "note" || !canReply ? "Only your team sees this…" : `Reply on ${CHANNEL[detail.channel]}…`}
                                        className="flex-1 px-3 py-2 rounded-lg border border-white/10 bg-slate-950 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-600" />
                                    <button type="submit" disabled={busy || !draft.trim()} aria-label="Send" className="px-4 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50"><Send className="h-4 w-4" /></button>
                                </div>
                            </form>
                        </>
                    )}
                </section>
            </div>
        </div>
    );
}
