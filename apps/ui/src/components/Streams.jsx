import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "./ToastContext.jsx";
import SubscriptionGuard from "./SubscriptionGuard";

const EVENT_TYPES = [
  "execution_started", "execution_progress", "execution_completed", "execution_failed",
  "execution_warning", "execution_paused", "execution_resumed", "execution_cancelled",
  "execution_step_started", "execution_step_progress", "execution_step_completed",
  "execution_step_failed", "execution_step_awaiting_approval", "sentinel_blocked", "execution_heartbeat",
];
const TERMINAL = ["execution_completed", "execution_failed", "execution_cancelled"];
const MAX_EVENTS = 1000;
const STALL_MS = 35000;

const group = (t) =>
  /fail|error|blocked/.test(t) ? "errors" : /approval/.test(t) ? "approvals" : /warning/.test(t) ? "warnings" : /heartbeat/.test(t) ? "heartbeat" : /step/.test(t) ? "steps" : "lifecycle";
const GROUPS = ["lifecycle", "steps", "approvals", "warnings", "errors", "heartbeat"];
const COLOR = {
  errors: "text-rose-400", approvals: "text-violet-300", warnings: "text-amber-400",
  heartbeat: "text-slate-600", steps: "text-cyan-300", lifecycle: "text-emerald-400",
};
const STATUS_TONE = {
  live: "text-emerald-400", reconnecting: "text-amber-400", stalled: "text-amber-400",
  connecting: "text-cyan-400", finished: "text-slate-400", offline: "text-rose-400",
};

function StreamsContent() {
  const { executionId } = useParams();
  const { token } = useAuth();
  const { addToast } = useToast();
  const toastRef = useRef(addToast);
  toastRef.current = addToast;

  const [events, setEvents] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [status, setStatus] = useState("connecting");
  const [hidden, setHidden] = useState(() => new Set(["heartbeat"]));
  const [query, setQuery] = useState("");
  const [follow, setFollow] = useState(true);
  const [open, setOpen] = useState({});
  const [view, setView] = useState("events");
  const [busy, setBusy] = useState(null);
  const scrollRef = useRef(null);
  const lastEventId = useRef(null);
  const lastSeen = useRef(Date.now());

  /* ---------- Stream: backoff reconnect, resume from last event, stall detection ---------- */
  useEffect(() => {
    if (!token) { setStatus("offline"); return; }
    let src, timer, attempt = 0, closed = false;

    const push = (type, raw, id) => {
      lastSeen.current = Date.now();
      let body = raw;
      try { body = JSON.parse(raw); } catch { /* keep raw text */ }
      const t = type === "message" ? body?.event || "message" : type;
      if (id) lastEventId.current = id;
      setEvents((prev) => [...prev, { id: id || crypto.randomUUID(), type: t, body, at: new Date() }].slice(-MAX_EVENTS));
      if (TERMINAL.includes(t)) { setStatus("finished"); closed = true; src?.close(); loadAudit(); }
    };

    const buildUrl = async () => {
      const base = `${import.meta.env.VITE_API_URL}/api/executions/${executionId}/stream`;
      const q = new URLSearchParams();
      if (lastEventId.current) q.set("lastEventId", lastEventId.current);
      try {
        const { ticket } = await apiFetch(`/executions/${executionId}/stream-ticket`, { method: "POST" });
        if (ticket) q.set("ticket", ticket);
      } catch { q.set("token", token); }
      return `${base}?${q}`;
    };

    const connect = async () => {
      if (closed) return;
      src = new EventSource(await buildUrl());
      src.onopen = () => { attempt = 0; lastSeen.current = Date.now(); setStatus("live"); };
      src.onmessage = (e) => push("message", e.data, e.lastEventId);
      EVENT_TYPES.forEach((t) => src.addEventListener(t, (e) => push(t, e.data, e.lastEventId)));
      src.onerror = () => {
        src.close();
        if (closed) return;
        setStatus("reconnecting");
        timer = setTimeout(connect, Math.min(30000, 1000 * 2 ** attempt++) + Math.random() * 400);
      };
    };

    const watchdog = setInterval(() => {
      if (!closed && Date.now() - lastSeen.current > STALL_MS) setStatus((s) => (s === "live" ? "stalled" : s));
    }, 5000);

    connect();
    return () => { closed = true; clearTimeout(timer); clearInterval(watchdog); src?.close(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [executionId, token]);

  /* ---------- Audit logs ---------- */
  const loadAudit = useCallback(async () => {
    try {
      const data = await apiFetch(`/executions/${executionId}/audit`);
      setAuditLogs(Array.isArray(data) ? data : data?.logs || []);
    } catch { setAuditLogs([]); }
  }, [executionId]);
  useEffect(() => { if (token) loadAudit(); }, [token, loadAudit]);

  /* ---------- Follow mode: pauses when the user scrolls up ---------- */
  useEffect(() => {
    const el = scrollRef.current;
    if (follow && el) el.scrollTop = el.scrollHeight;
  }, [events, follow, view]);
  const onScroll = (e) => {
    const el = e.currentTarget;
    setFollow(el.scrollHeight - el.scrollTop - el.clientHeight < 40);
  };

  /* ---------- Inline approvals ---------- */
  const decide = async (ev, decision) => {
    const stepId = ev.body?.stepId || ev.body?.step;
    setBusy(ev.id);
    try {
      await apiFetch(`/executions/${executionId}/steps/${stepId}/${decision}`, { method: "POST" });
      toastRef.current(decision === "approve" ? "Step approved" : "Step rejected", "success");
    } catch { toastRef.current("Decision failed", "error"); }
    finally { setBusy(null); }
  };

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return events.filter((e) => !hidden.has(group(e.type)) && (!q || (e.type + JSON.stringify(e.body)).toLowerCase().includes(q)));
  }, [events, hidden, query]);

  const counts = useMemo(() => events.reduce((c, e) => ((c[group(e.type)] = (c[group(e.type)] || 0) + 1), c), {}), [events]);
  const pending = useMemo(() => {
    const done = new Set(events.filter((e) => /step_(completed|failed)|resumed/.test(e.type)).map((e) => String(e.body?.stepId || e.body?.step)));
    return new Set(events.filter((e) => e.type.includes("awaiting_approval") && !done.has(String(e.body?.stepId || e.body?.step))).map((e) => e.id));
  }, [events]);

  const download = () => {
    const nd = events.map((e) => JSON.stringify({ at: e.at.toISOString(), type: e.type, body: e.body })).join("\n");
    const url = URL.createObjectURL(new Blob([nd], { type: "application/x-ndjson" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `stream_${executionId.slice(0, 8)}.ndjson` });
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggle = (g) => setHidden((h) => { const n = new Set(h); n.has(g) ? n.delete(g) : n.add(g); return n; });
  const chip = "text-xs px-2.5 py-1 rounded-full border transition-colors";

  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 p-4 md:p-8 font-mono">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white font-sans">Live stream</h1>
          <p className="text-xs mt-1">
            <span className={STATUS_TONE[status]}>● {status}</span>
            <span className="text-slate-500"> · {events.length} events</span>
            {status === "stalled" && <span className="text-amber-400"> · no data for 35s, the worker may be busy</span>}
          </p>
        </div>
        <div className="flex gap-2 text-xs font-sans">
          <Link to={`/executions/${executionId}`} className="px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-cyan-300">Open full trace</Link>
          <button onClick={download} disabled={!events.length} className="px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 disabled:opacity-40">Download NDJSON</button>
          <button onClick={() => setEvents([])} className="px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800">Clear</button>
          <Link to="/" className="px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800">Dashboard</Link>
        </div>
      </div>

      {pending.size > 0 && (
        <div role="alert" className="mb-4 rounded-lg border border-violet-500/30 bg-violet-500/5 px-4 py-2.5 text-xs text-violet-200 font-sans">
          {pending.size} step{pending.size > 1 ? "s" : ""} waiting for approval. Approve or reject below.
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 mb-3 font-sans">
        {GROUPS.map((g) => (
          <button key={g} onClick={() => toggle(g)} aria-pressed={!hidden.has(g)} className={`${chip} ${hidden.has(g) ? "border-slate-800 text-slate-600" : "border-slate-600 text-slate-200 bg-slate-800/60"}`}>
            {g} {counts[g] ? `(${counts[g]})` : ""}
          </button>
        ))}
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search events" aria-label="Search events" className="ml-auto bg-slate-900 border border-slate-700 rounded-md px-3 py-1.5 text-xs w-52 focus:outline-none focus:border-cyan-500" />
      </div>

      <div className="flex border-b border-slate-800 mb-3 font-sans" role="tablist">
        {[["events", `Events (${visible.length})`], ["audit", `Audit logs (${auditLogs.length})`]].map(([k, l]) => (
          <button key={k} role="tab" aria-selected={view === k} onClick={() => setView(k)} className={`pb-2 px-4 text-xs font-semibold border-b-2 ${view === k ? "border-cyan-500 text-cyan-400" : "border-transparent text-slate-400 hover:text-slate-200"}`}>{l}</button>
        ))}
      </div>

      <div ref={scrollRef} onScroll={onScroll} tabIndex={0} aria-label="Event stream" aria-live="off" className="overflow-y-auto h-[60vh] border border-slate-800 rounded-xl bg-slate-950 p-3 text-xs">
        {view === "events" ? (
          visible.length === 0 ? (
            <p className="text-slate-500 p-4 font-sans">{events.length ? "No events match these filters." : status === "finished" ? "This run produced no live events." : "Waiting for the first event..."}</p>
          ) : (
            <ul className="space-y-1">
              {visible.map((e) => {
                const g = group(e.type);
                const isOpen = !!open[e.id];
                const summary = e.body?.message || e.body?.stepType || e.body?.tool || (typeof e.body === "string" ? e.body : "");
                return (
                  <li key={e.id} className="rounded px-2 py-1 hover:bg-slate-900">
                    <button onClick={() => setOpen((o) => ({ ...o, [e.id]: !isOpen }))} className="w-full text-left flex gap-3" aria-expanded={isOpen}>
                      <span className="text-slate-600 shrink-0">{e.at.toLocaleTimeString()}</span>
                      <span className={`${COLOR[g]} font-semibold shrink-0`}>{e.type.replace("execution_", "")}</span>
                      <span className="text-slate-400 truncate">{summary}</span>
                    </button>
                    {isOpen && <pre className="mt-1 ml-1 p-2 bg-slate-900 rounded text-slate-300 whitespace-pre-wrap break-all">{JSON.stringify(e.body, null, 2)}</pre>}
                    {pending.has(e.id) && (
                      <div className="mt-1 ml-1 flex gap-2 font-sans">
                        <button disabled={busy === e.id} onClick={() => decide(e, "approve")} className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50">Approve</button>
                        <button disabled={busy === e.id} onClick={() => decide(e, "reject")} className="px-3 py-1 rounded bg-rose-950/60 border border-rose-800/40 text-rose-300 hover:bg-rose-900/60 disabled:opacity-50">Reject</button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )
        ) : auditLogs.length === 0 ? (
          <p className="text-slate-500 p-4 font-sans">No audit entries yet. They appear as steps complete.</p>
        ) : (
          <ul className="space-y-1">
            {auditLogs.map((l) => (
              <li key={l.id} className="px-2 py-1">
                <span className="text-slate-600">{new Date(l.created_at).toLocaleTimeString()}</span>{" "}
                <span className="font-semibold text-slate-200">{l.status}</span>{" "}
                <span className="text-slate-400 break-all">{typeof l.meta === "object" ? JSON.stringify(l.meta) : l.meta}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {!follow && view === "events" && (
        <button onClick={() => setFollow(true)} className="mt-3 text-xs font-sans px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white">Jump to latest</button>
      )}
    </div>
  );
}

// Guard wraps the component so the stream never opens for users without access
export default function Streams() {
  return (
    <SubscriptionGuard>
      <StreamsContent />
    </SubscriptionGuard>
  );
}
