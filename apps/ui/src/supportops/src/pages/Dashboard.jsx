import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  MessageCircle, Phone, Mail, Smartphone, Globe, Share2, Clock, AlertTriangle,
  CheckCircle2, TrendingUp, Users, DollarSign, Sparkles, Ticket, RefreshCw,
  Inbox, Activity, Plug, Zap,
} from "lucide-react";
import RevenueChart from "../components/RevenueChart";
import AIImpact from "../components/AIImpact";
import { useAgentStream } from "../hooks/useAgentStream";
import { API_ENDPOINTS, SUPPORTOPS_API, ROUTES } from "../config/paths";

/* ---------- config ---------- */
const CHANNELS = {
  whatsapp: { label: "WhatsApp", icon: MessageCircle, tone: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  voice: { label: "Phone", icon: Phone, tone: "text-sky-400 bg-sky-500/10 border-sky-500/20" },
  email: { label: "Email", icon: Mail, tone: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  sms: { label: "SMS", icon: Smartphone, tone: "text-violet-400 bg-violet-500/10 border-violet-500/20" },
  web: { label: "Web chat", icon: Globe, tone: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20" },
  social: { label: "Social", icon: Share2, tone: "text-pink-400 bg-pink-500/10 border-pink-500/20" },
};
const VIEWS = { agent: "Agent", management: "Management", admin: "Admin", investor: "Investor" };
const ALIAS = { user: "agent", agent: "agent", management: "management", admin: "admin", investor: "investor" };
const TITLES = {
  agent: ["My queue", "Your tickets from every channel, most urgent first"],
  management: ["Operations", "Backlog, SLA health and workload across all channels"],
  admin: ["Workspace admin", "Channels, integrations, seats and system health"],
  investor: ["Business performance", "Revenue, growth and what AI is saving"],
};

// Shown only in development when the tickets API returns nothing
const SAMPLE = [
  { id: "T-1042", subject: "Payment failed twice at checkout", customer: "Amina K.", channel: "whatsapp", priority: "high", slaMins: 12 },
  { id: "T-1041", subject: "Missed call: delivery not received", customer: "Brian O.", channel: "voice", priority: "urgent", slaMins: -8 },
  { id: "T-1039", subject: "Invoice copy request", customer: "Nia Traders", channel: "email", priority: "low", slaMins: 190 },
  { id: "T-1037", subject: "Cannot reset password", customer: "Joy M.", channel: "web", priority: "normal", slaMins: 55 },
];

/* ---------- helpers ---------- */
async function getJSON(url, signal) {
  const token = localStorage.getItem("authToken");
  const org = localStorage.getItem("activeOrgId");
  const res = await fetch(url, {
    signal,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(org ? { "X-Org-Id": org } : {}) },
  });
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
}
const toList = (d) => (Array.isArray(d) ? d : d?.items ?? d?.tickets ?? []);
const val = (v, fmt = (x) => x) => (v === undefined || v === null ? "—" : fmt(v));
const slaMins = (t) => (typeof t.slaMins === "number" ? t.slaMins : t.slaDueAt ? Math.round((new Date(t.slaDueAt) - Date.now()) / 60000) : null);

function SlaPill({ mins }) {
  if (mins === null) return <span className="text-[11px] text-slate-500">No SLA</span>;
  const cls = mins < 0 ? "text-red-300 bg-red-500/10 border-red-500/30" : mins <= 60 ? "text-amber-300 bg-amber-500/10 border-amber-500/30" : "text-slate-300 bg-slate-500/10 border-slate-500/30";
  const text = mins < 0 ? `Breached ${Math.abs(mins)}m` : mins < 120 ? `${mins}m left` : `${Math.round(mins / 60)}h left`;
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-medium ${cls}`}><Clock className="h-3 w-3" />{text}</span>;
}

function ChannelBadge({ channel }) {
  const c = CHANNELS[channel] ?? CHANNELS.web;
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] ${c.tone}`}><c.icon className="h-3 w-3" />{c.label}</span>;
}

const Card = ({ title, icon: Icon, action, children, className = "" }) => (
  <section className={`rounded-2xl bg-slate-900/40 border border-slate-800/80 p-5 backdrop-blur-xl ${className}`}>
    <header className="flex items-center justify-between mb-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-white"><Icon className="h-4 w-4 text-cyan-400" />{title}</h2>
      {action}
    </header>
    {children}
  </section>
);

const Kpi = ({ label, value, hint, icon: Icon }) => (
  <div className="rounded-2xl bg-slate-900/40 border border-slate-800/80 p-5">
    <div className="flex items-center justify-between mb-3">
      <span className="text-xs font-medium text-slate-400">{label}</span>
      <span className="p-2 rounded-lg bg-white/5 border border-white/10"><Icon className="h-4 w-4 text-cyan-400" /></span>
    </div>
    <div className="text-3xl font-extrabold tracking-tight text-white">{value}</div>
    {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
  </div>
);

const Empty = ({ icon: Icon, title, text }) => (
  <div className="py-10 text-center">
    <Icon className="h-8 w-8 mx-auto mb-2 text-slate-600" />
    <p className="text-sm font-medium text-slate-300">{title}</p>
    <p className="text-xs text-slate-500 mt-1">{text}</p>
  </div>
);

/* ---------- panels ---------- */
function TicketList({ tickets }) {
  if (!tickets.length) return <Empty icon={CheckCircle2} title="Inbox zero" text="No open tickets. New WhatsApp, call, email and chat tickets appear here." />;
  return (
    <ul className="divide-y divide-slate-800/80">
      {tickets.map((t) => (
        <li key={t.id} className="py-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <ChannelBadge channel={t.channel} />
              <span className="text-[11px] font-mono text-slate-500">{t.id}</span>
              {["urgent", "high"].includes(t.priority) && <span className="text-[11px] font-semibold text-red-400 uppercase">{t.priority}</span>}
            </div>
            <p className="text-sm text-slate-100 truncate">{t.subject}</p>
            <p className="text-xs text-slate-500">{t.customer}</p>
          </div>
          <SlaPill mins={slaMins(t)} />
        </li>
      ))}
    </ul>
  );
}

function ChannelMix({ tickets, byChannel }) {
  const counts = useMemo(() => {
    if (byChannel) return byChannel;
    return tickets.reduce((a, t) => ({ ...a, [t.channel]: (a[t.channel] ?? 0) + 1 }), {});
  }, [tickets, byChannel]);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (!total) return <Empty icon={Inbox} title="No volume yet" text="Channel mix appears once tickets arrive." />;
  return (
    <ul className="space-y-3">
      {Object.entries(counts).map(([k, n]) => (
        <li key={k}>
          <div className="flex justify-between text-xs mb-1"><ChannelBadge channel={k} /><span className="text-slate-400">{n} · {Math.round((n / total) * 100)}%</span></div>
          <div className="h-1.5 rounded-full bg-slate-800"><div className="h-full rounded-full bg-cyan-500" style={{ width: `${(n / total) * 100}%` }} /></div>
        </li>
      ))}
    </ul>
  );
}

function ChannelConnections({ channels }) {
  return (
    <ul className="grid sm:grid-cols-2 gap-3">
      {Object.entries(CHANNELS).map(([k, c]) => {
        const on = Boolean(channels[k]?.connected);
        return (
          <li key={k} className="flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-slate-800/20">
            <div className="flex items-center gap-3">
              <span className={`p-2 rounded-lg border ${c.tone}`}><c.icon className="h-4 w-4" /></span>
              <div>
                <p className="text-sm text-slate-100">{c.label}</p>
                <p className={`text-[11px] ${on ? "text-emerald-400" : "text-slate-500"}`}>{on ? "Connected" : "Not connected"}</p>
              </div>
            </div>
            <Link to={ROUTES.admin.channels} className="px-3 py-1.5 rounded-lg text-xs border border-slate-700 text-slate-200 hover:bg-white/5">{on ? "Manage" : "Connect"}</Link>
          </li>
        );
      })}
    </ul>
  );
}

function LiveActivity({ events }) {
  if (!events.length) return <Empty icon={Activity} title="Listening…" text="Live agent and AI activity shows here." />;
  return (
    <ul className="space-y-2">
      {events.slice(0, 5).map((e, i) => (
        <li key={e.id || i} className="flex items-center gap-2 text-xs text-slate-300 p-2 rounded-lg bg-slate-800/30">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" /><span className="truncate">{e.description}</span>
        </li>
      ))}
    </ul>
  );
}

/* ---------- main ---------- */
export default function WorkspaceDashboard({ view, role = "admin", user }) {
  const [preview, setPreview] = useState(null);
  const current = preview ?? view ?? ALIAS[role] ?? "agent";

  const [timeframe, setTimeframe] = useState("30d");
  const [metrics, setMetrics] = useState(null);
  const [health, setHealth] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [channels, setChannels] = useState({});
  const [demo, setDemo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { events = [], isConnected } = useAgentStream(API_ENDPOINTS.activityStream);

  const load = useCallback(async (signal) => {
    const [m, h, t, c] = await Promise.allSettled([
      getJSON(API_ENDPOINTS.metrics(timeframe), signal),
      getJSON(API_ENDPOINTS.health, signal),
      getJSON(SUPPORTOPS_API.tickets("", { status: "open", limit: 10 }), signal),
      getJSON(SUPPORTOPS_API.tickets("/channels"), signal),
    ]);
    if (signal?.aborted) return;

    if (m.status === "fulfilled") setMetrics(m.value);
    if (h.status === "fulfilled") setHealth(h.value);

    let list = t.status === "fulfilled" ? toList(t.value) : [];
    const isDemo = list.length === 0 && import.meta.env.DEV;
    if (isDemo) list = SAMPLE;
    setDemo(isDemo);
    setTickets([...list].sort((a, b) => (slaMins(a) ?? 1e9) - (slaMins(b) ?? 1e9)));

    const raw = c.status === "fulfilled" ? c.value?.channels ?? c.value : [];
    setChannels(Array.isArray(raw) ? Object.fromEntries(raw.map((x) => [x.key, x])) : raw ?? {});

    setError(m.status === "rejected" ? "Could not load the latest metrics. Showing what we have." : null);
    setLoading(false);
  }, [timeframe]);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const atRisk = tickets.filter((t) => (slaMins(t) ?? 1e9) <= 60);
  const connected = Object.values(CHANNELS).filter((_, i) => channels[Object.keys(CHANNELS)[i]]?.connected).length;
  const mrrGrowth = metrics?.mrrChange;

  // One sentence telling each role what to do first
  const nextAction = {
    agent: atRisk.length ? `${atRisk.length} ticket${atRisk.length > 1 ? "s" : ""} will breach SLA within the hour. Start with ${atRisk[0].id}.` : "Nothing is close to breaching SLA. Pick up the oldest ticket.",
    management: atRisk.length ? `${atRisk.length} open ticket${atRisk.length > 1 ? "s are" : " is"} at SLA risk. Consider rebalancing the queue.` : "SLA health looks good across channels.",
    admin: connected < 3 ? `Only ${connected} of ${Object.keys(CHANNELS).length} channels are connected. Connect WhatsApp and Phone first.` : "Channels are connected. Review seat usage and integrations.",
    investor: mrrGrowth ? `MRR is ${mrrGrowth} for this period.` : "Metrics update as revenue data arrives.",
  }[current];

  const kpis = {
    agent: [
      ["Open tickets", tickets.length, "In your queue", Ticket],
      ["SLA at risk", atRisk.length, "Due within 60 min", AlertTriangle],
      ["Avg first response", val(metrics?.avgFirstResponseMin, (v) => `${v} min`), "This period", Clock],
      ["Customer satisfaction", val(metrics?.csat, (v) => `${v}%`), "CSAT", Sparkles],
    ],
    management: [
      ["Backlog", val(metrics?.backlog ?? tickets.length), "Open across channels", Inbox],
      ["SLA compliance", val(metrics?.slaCompliance, (v) => `${v}%`), "Resolved on time", CheckCircle2],
      ["Avg resolution", val(metrics?.avgResolutionHours, (v) => `${v} h`), "This period", Clock],
      ["AI resolution rate", val(metrics?.aiResolutionRate, (v) => `${v}%`), "Handled without an agent", Sparkles],
    ],
    admin: [
      ["Channels connected", `${connected}/${Object.keys(CHANNELS).length}`, "WhatsApp, calls, email…", Plug],
      ["Seats used", val(metrics?.seatsUsed, (v) => `${v}${metrics?.seatLimit ? `/${metrics.seatLimit}` : ""}`), "This workspace", Users],
      ["Tickets processed", val(metrics?.tickets, (v) => v.toLocaleString()), timeframe, Ticket],
      ["API latency", val(health?.apiLatencyMs, (v) => `${v} ms`), health?.uptime ?? "System health", Activity],
    ],
    investor: [
      ["Monthly recurring revenue", val(metrics?.mrr, (v) => `$${v.toLocaleString()}`), metrics?.mrrChange, DollarSign],
      ["Active customers", val(metrics?.customers, (v) => v.toLocaleString()), metrics?.customersChange, Users],
      ["Tickets handled", val(metrics?.tickets, (v) => v.toLocaleString()), metrics?.ticketsChange, Ticket],
      ["AI resolution rate", val(metrics?.aiResolutionRate, (v) => `${v}%`), "Cost saved by automation", Sparkles],
    ],
  }[current];

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="text-xs text-slate-500 mb-1">Welcome back{user?.name ? `, ${user.name}` : ""}</p>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{TITLES[current][0]}</h1>
          <p className="text-sm text-slate-400">{TITLES[current][1]}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {role === "admin" && (
            <div className="flex rounded-xl border border-slate-800 bg-slate-900 p-1">
              {Object.entries(VIEWS).map(([k, label]) => (
                <button key={k} type="button" onClick={() => setPreview(k)}
                  className={`px-3 py-1.5 text-xs rounded-lg transition ${current === k ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"}`}>{label}</button>
              ))}
            </div>
          )}
          <select value={timeframe} onChange={(e) => setTimeframe(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-900 border border-slate-800 rounded-xl text-slate-300 focus:outline-none">
            <option value="7d">Last 7 days</option><option value="30d">Last 30 days</option><option value="90d">Last 90 days</option>
          </select>
          <button type="button" onClick={() => load()} aria-label="Refresh"
            className="p-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-300 hover:text-white"><RefreshCw className="h-4 w-4" /></button>
        </div>
      </div>

      {/* Banners */}
      <div className="mb-6 flex items-start gap-3 rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-4 py-3 text-sm text-cyan-100">
        <Zap className="h-4 w-4 mt-0.5 shrink-0 text-cyan-400" /><span>{nextAction}</span>
      </div>
      {error && <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-300">{error}</div>}
      {demo && <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">Sample data shown because the tickets API returned nothing (development only).</div>}

      {loading ? (
        <div className="flex items-center justify-center py-24 text-slate-400"><RefreshCw className="h-6 w-6 animate-spin mr-3 text-cyan-400" />Loading your workspace…</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
            {kpis.map(([label, value, hint, icon]) => <Kpi key={label} label={label} value={value} hint={hint} icon={icon} />)}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 space-y-6">
              {current === "agent" && (
                <Card title="Priority queue" icon={Inbox} action={<Link to={ROUTES.agent.tickets} className="text-xs text-cyan-400 hover:underline">Open tickets</Link>}>
                  <TicketList tickets={tickets} />
                </Card>
              )}
              {current === "management" && (
                <>
                  <Card title="Tickets at SLA risk" icon={AlertTriangle}><TicketList tickets={atRisk} /></Card>
                  <Card title="Channel mix" icon={Inbox}><ChannelMix tickets={tickets} byChannel={metrics?.byChannel} /></Card>
                </>
              )}
              {current === "admin" && (
                <Card title="Channels" icon={Plug}><ChannelConnections channels={channels} /></Card>
              )}
              {current === "investor" && (
                <div className="rounded-2xl bg-slate-900/40 border border-slate-800/80 p-1"><RevenueChart timeframe={timeframe} /></div>
              )}
            </div>

            <div className="space-y-6">
              {["management", "investor"].includes(current) && (
                <div className="rounded-2xl bg-slate-900/40 border border-slate-800/80 p-1"><AIImpact timeframe={timeframe} /></div>
              )}
              <Card title="Live activity" icon={Activity}
                action={<span className={`text-[11px] ${isConnected ? "text-emerald-400" : "text-amber-400"}`}>{isConnected ? "Live" : "Connecting…"}</span>}>
                <LiveActivity events={events} />
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
