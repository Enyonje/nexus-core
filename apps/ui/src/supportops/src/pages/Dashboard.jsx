// src/pages/Dashboard.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  MessageCircle, Phone, Mail, Smartphone, Globe, Share2, Clock, AlertTriangle,
  CheckCircle2, Users, DollarSign, Sparkles, Ticket, RefreshCw, Inbox, Activity,
  Plug, LockKeyhole, UserPlus, Send, X, Check, ShieldCheck, Loader2, Lightbulb,
} from "lucide-react";

import RevenueChart from "../components/RevenueChart";
import { PlanBanner } from "../components/Access";
import AIImpact from "../components/AIImpact";
import { useAgentStream } from "../hooks/useAgentStream";
import { API_ENDPOINTS, SUPPORTOPS_API, ROUTES } from "../config/paths";
import { useAuth } from "../context/AuthContext";

/* ================= configuration ================= */

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

// Which views each role may open. Anything else falls back to the role's own view (no redirects, so no loops).
const ALLOWED = {
  agent: ["agent"],
  management: ["management"],
  investor: ["investor"],
  admin: ["admin", "agent", "management", "investor"],
};

const TITLES = {
  agent: ["My queue", "Your tickets from every channel, most urgent first"],
  management: ["Operations", "Backlog, SLA health and workload across all channels"],
  admin: ["Executive command center", "Set up your workspace, bring your team together and oversee customer operations"],
  investor: ["Business performance", "Revenue, growth and what AI is saving"],
};

const INVITABLE_ROLES = [
  { value: "agent", label: "Support agent" },
  { value: "management", label: "Manager" },
  { value: "investor", label: "Investor" },
];

const SAMPLE = [
  { id: "T-1042", subject: "Payment failed twice at checkout", customer: "Amina K.", channel: "whatsapp", priority: "high", slaMins: 12 },
  { id: "T-1041", subject: "Missed call: delivery not received", customer: "Brian O.", channel: "voice", priority: "urgent", slaMins: -8 },
  { id: "T-1039", subject: "Invoice copy request", customer: "Nia Traders", channel: "email", priority: "low", slaMins: 190 },
  { id: "T-1037", subject: "Cannot reset password", customer: "Joy M.", channel: "web", priority: "normal", slaMins: 55 },
];

const API_BASE_URL = (
  import.meta.env.VITE_SUPPORTOPS_API_URL ||
  import.meta.env.VITE_BACKEND_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  "https://nexus-core-a0px.onrender.com"
).replace(/\/api\/?$/, "");

const REFRESH_MS = 60_000;
const TOKEN_KEYS = ["token", "authToken", "access_token", "supportops_token"];

/* ================= helpers ================= */

const readStore = (keys) => {
  try {
    for (const key of keys) {
      const value = localStorage.getItem(key);
      if (value) return value;
    }
  } catch { /* storage blocked */ }
  return null;
};
const getToken = () => (typeof window === "undefined" ? null : readStore(TOKEN_KEYS));
const getOrg = () => (typeof window === "undefined" ? null : readStore(["activeOrgId", "orgId"]));

const isAbortError = (e) =>
  e?.name === "AbortError" || e?.name === "CanceledError" || e?.code === "ERR_CANCELED" || e?.code === "ABORT_ERR";

function resolveUrl(url) {
  if (!url) return null;
  if (!url.startsWith("/")) return url;
  const path = url === "/api" || url.startsWith("/api/") ? url : `/api${url}`;
  return `${API_BASE_URL}${path}`;
}

/** One request function for everything. Throws Error with .status on failure. */
async function api(url, { method = "GET", body, signal } = {}) {
  const token = getToken();
  const full = resolveUrl(url);
  if (!full) throw Object.assign(new Error("Missing endpoint."), { status: 0 });
  if (!token) throw Object.assign(new Error("Your session has expired. Sign in again to continue."), { status: 401 });
  const org = getOrg();

  const response = await fetch(full, {
    method,
    signal,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(org ? { "X-Org-Id": org } : {}),
      "X-App-Slug": "supportops",
      Accept: "application/json",
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = null; }

  if (!response.ok || data?.success === false) {
    const message =
      response.status === 401 ? "Your session has expired. Sign in again to continue."
        : response.status === 403 ? "You don't have permission to do that."
          : data?.message || data?.error || `Request failed (${response.status})`;
    throw Object.assign(new Error(message), { status: response.status });
  }
  return data;
}

// The invites config may be a function or an object depending on paths.js; support both.
const invitesRoot = () => {
  const inv = SUPPORTOPS_API?.invites;
  if (typeof inv === "function") return inv("");
  return inv?.root || "/api/supportops/invites";
};
const inviteItemUrl = (id) => `${String(invitesRoot()).replace(/\/$/, "")}/${encodeURIComponent(id)}`;

const asList = (data, keys) => {
  if (Array.isArray(data)) return data;
  for (const key of keys) {
    const found = data?.[key] ?? data?.data?.[key];
    if (Array.isArray(found)) return found;
  }
  return Array.isArray(data?.data) ? data.data : [];
};

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : null);
const fmt = (v) => (num(v) === null ? "—" : num(v).toLocaleString());
const val = (v, f = (x) => x) => (v === undefined || v === null ? "—" : f(v));
const delta = (v) => {
  if (v === undefined || v === null) return undefined;
  const n = num(v);
  return n === null ? String(v) : `${n > 0 ? "+" : ""}${n}% vs previous`;
};

const slaMins = (ticket, now = Date.now()) =>
  typeof ticket?.slaMins === "number"
    ? ticket.slaMins
    : ticket?.slaDueAt
      ? Math.round((new Date(ticket.slaDueAt).getTime() - now) / 60000)
      : null;

/* ================= shared UI ================= */

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70";

function SlaPill({ mins }) {
  if (mins === null || Number.isNaN(mins)) return <span className="text-[11px] text-slate-500">No SLA</span>;
  const tone =
    mins < 0 ? "text-red-300 bg-red-500/10 border-red-500/30"
      : mins <= 60 ? "text-amber-300 bg-amber-500/10 border-amber-500/30"
        : "text-slate-300 bg-slate-500/10 border-slate-500/30";
  const label = mins < 0 ? `Breached ${Math.abs(mins)}m` : mins < 120 ? `${mins}m left` : `${Math.round(mins / 60)}h left`;
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${tone}`}>
      <Clock className="h-3 w-3" aria-hidden="true" />{label}
    </span>
  );
}

function ChannelBadge({ channel }) {
  const config = CHANNELS[channel] ?? CHANNELS.web;
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] ${config.tone}`}>
      <Icon className="h-3 w-3" aria-hidden="true" />{config.label}
    </span>
  );
}

function Card({ title, icon: Icon, action, children, className = "" }) {
  return (
    <section className={`rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5 backdrop-blur-xl ${className}`}>
      <header className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
          <Icon className="h-4 w-4 text-cyan-400" aria-hidden="true" />{title}
        </h2>
        {action}
      </header>
      {children}
    </section>
  );
}

function Kpi({ label, value, hint, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-medium text-slate-400">{label}</span>
        <span className="rounded-lg border border-white/10 bg-white/5 p-2"><Icon className="h-4 w-4 text-cyan-400" aria-hidden="true" /></span>
      </div>
      <div className="text-3xl font-extrabold tracking-tight text-white">{value}</div>
      {hint !== undefined && hint !== null && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
    </div>
  );
}

function Empty({ icon: Icon, title, text }) {
  return (
    <div className="py-10 text-center">
      <Icon className="mx-auto mb-2 h-8 w-8 text-slate-600" aria-hidden="true" />
      <p className="text-sm font-medium text-slate-300">{title}</p>
      <p className="mt-1 text-xs text-slate-500">{text}</p>
    </div>
  );
}

function Skeleton() {
  const block = "motion-safe:animate-pulse rounded-2xl bg-slate-900/60 border border-slate-800/60";
  return (
    <div aria-busy="true" aria-label="Loading your workspace">
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <div key={i} className={`${block} h-32`} />)}
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className={`${block} h-80 xl:col-span-2`} />
        <div className={`${block} h-80`} />
      </div>
    </div>
  );
}

function AccessRequired() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#030712] px-6 text-slate-100">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/70 p-8 text-center">
        <LockKeyhole className="mx-auto mb-4 h-10 w-10 text-cyan-400" aria-hidden="true" />
        <h1 className="text-2xl font-bold text-white">Sign in to continue</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          Dashboard data, tickets and workspace activity are available to authorized team members only.
        </p>
        <Link to={ROUTES?.login || "/supportops/login"} className={`mt-6 inline-flex items-center justify-center rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500 ${focusRing}`}>
          Sign in
        </Link>
      </div>
    </div>
  );
}

/* ================= panels ================= */

function TicketList({ tickets = [], now }) {
  if (!tickets.length) {
    return <Empty icon={CheckCircle2} title="Queue is clear" text="New tickets appear here the moment they arrive." />;
  }
  return (
    <ul className="divide-y divide-slate-800/80">
      {tickets.map((t, i) => (
        <li key={t?.id ?? `${t?.subject}-${i}`} className="flex items-center justify-between gap-3 py-3">
          <div className="min-w-0">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <ChannelBadge channel={t?.channel} />
              <span className="font-mono text-[11px] text-slate-500">{t?.id}</span>
              {["urgent", "high"].includes(t?.priority) && (
                <span className="text-[11px] font-semibold uppercase text-red-400">{t.priority}</span>
              )}
            </div>
            <p className="truncate text-sm text-slate-100">{t?.subject}</p>
            <p className="text-xs text-slate-500">{t?.customer}</p>
          </div>
          <SlaPill mins={slaMins(t, now)} />
        </li>
      ))}
    </ul>
  );
}

function ChannelMix({ tickets = [], byChannel }) {
  const counts = useMemo(() => {
    if (byChannel && typeof byChannel === "object") return byChannel;
    return tickets.reduce((acc, t) => {
      const key = t?.channel || "web";
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});
  }, [tickets, byChannel]);

  const total = Object.values(counts).reduce((s, c) => s + (num(c) ?? 0), 0);
  if (!total) return <Empty icon={Inbox} title="No volume yet" text="Channel statistics appear once tickets come in." />;

  return (
    <ul className="space-y-3">
      {Object.entries(counts).map(([channel, count]) => {
        const pct = ((num(count) ?? 0) / total) * 100;
        return (
          <li key={channel}>
            <div className="mb-1 flex justify-between text-xs">
              <ChannelBadge channel={channel} />
              <span className="text-slate-400">{fmt(count)} · {Math.round(pct)}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-800" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full rounded-full bg-cyan-500" style={{ width: `${pct}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function ChannelConnections({ channels = {} }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {Object.entries(CHANNELS).map(([key, channel]) => {
        const Icon = channel.icon;
        const connected = Boolean(channels?.[key]?.connected);
        return (
          <li key={key} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-800/20 p-3">
            <div className="flex items-center gap-3">
              <span className={`rounded-lg border p-2 ${channel.tone}`}><Icon className="h-4 w-4" aria-hidden="true" /></span>
              <div>
                <p className="text-sm text-slate-100">{channel.label}</p>
                <p className={`text-[11px] ${connected ? "text-emerald-400" : "text-slate-500"}`}>{connected ? "Connected" : "Not connected"}</p>
              </div>
            </div>
            <Link to={ROUTES?.admin?.channels || "/supportops/admin/channels"} className={`rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-200 hover:bg-white/5 ${focusRing}`}>
              {connected ? "Manage" : "Connect"}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function LiveActivity({ events = [] }) {
  const list = Array.isArray(events) ? events.slice(0, 6) : [];
  if (!list.length) return <Empty icon={Activity} title="No recent activity" text="Agent and AI actions show up here in real time." />;
  return (
    <ul className="space-y-2">
      {list.map((e, i) => (
        <li key={e?.id ?? i} className="flex items-center gap-2 rounded-lg bg-slate-800/30 p-2 text-xs text-slate-300">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400 motion-safe:animate-pulse" />
          <span className="truncate">{e?.description || "Activity recorded"}</span>
        </li>
      ))}
    </ul>
  );
}

/** Plain-language read of the live data, so a leader knows what to do first. No invented numbers. */
function Briefing({ current, tickets, now, metrics, connected, totalChannels, invites }) {
  const items = [];
  const breached = tickets.filter((t) => (slaMins(t, now) ?? Infinity) < 0).length;
  const atRisk = tickets.filter((t) => { const m = slaMins(t, now); return m !== null && m >= 0 && m <= 60; }).length;
  const ai = num(metrics?.aiResolutionRate);

  if (breached) items.push({ tone: "text-red-300", text: `${breached} ticket${breached === 1 ? " has" : "s have"} breached SLA. Reassign or reply to these first.` });
  if (atRisk) items.push({ tone: "text-amber-300", text: `${atRisk} more ${atRisk === 1 ? "is" : "are"} due within the hour.` });
  if (!breached && !atRisk && tickets.length) items.push({ tone: "text-emerald-300", text: "Every open ticket is inside its SLA window." });

  if (current === "management" && ai !== null) items.push({ tone: "text-slate-300", text: `AI is resolving ${ai}% of conversations without an agent.` });
  if (current === "admin") {
    if (connected < totalChannels) items.push({ tone: "text-slate-300", text: `${totalChannels - connected} channel${totalChannels - connected === 1 ? " is" : "s are"} not connected. Each one is a place customers can't reach you.` });
    if (!invites.length) items.push({ tone: "text-slate-300", text: "No teammates invited yet. Invite your first agent to start routing tickets." });
  }
  if (current === "investor") {
    const g = num(metrics?.mrrChange);
    if (g !== null) items.push({ tone: g >= 0 ? "text-emerald-300" : "text-red-300", text: `Monthly recurring revenue moved ${g > 0 ? "+" : ""}${g}% against the previous period.` });
    if (ai !== null) items.push({ tone: "text-slate-300", text: `AI handles ${ai}% of support volume, which is the main driver of cost savings.` });
  }
  if (!items.length) return null;

  return (
    <Card title="Today's briefing" icon={Lightbulb} className="mb-6">
      <ul className="space-y-2" aria-live="polite">
        {items.slice(0, 4).map((item, i) => <li key={i} className={`text-sm ${item.tone}`}>{item.text}</li>)}
      </ul>
    </Card>
  );
}

/* ================= executive onboarding ================= */

function ExecutiveOnboarding({ user, channels, invites, invitesLoading, onInvite, onRevoke, revokeBusyId }) {
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("agent");
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setInviteError("Couldn't copy automatically. Select the link and copy it manually.");
    }
  }

  const connectedChannels = Object.values(channels || {}).filter((c) => c?.connected).length;
  const pending = invites.filter((i) => (i?.status || "pending").toLowerCase() === "pending");

  async function submitInvite(event) {
    event.preventDefault();
    setInviteError("");
    setInviteSuccess("");
    setInviteLink("");
    const clean = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) return setInviteError("Enter a valid email address.");
    setSubmitting(true);
    try {
      const res = await onInvite({ email: clean, role: inviteRole });
      const d = res?.data ?? res ?? {};
      const token = d.token ?? d.inviteToken;
      const link =
        d.inviteUrl ?? d.inviteLink ?? d.url ?? d.link ??
        (token && ROUTES?.acceptInvite ? `${window.location.origin}${ROUTES.acceptInvite}?token=${encodeURIComponent(token)}` : "");
      setInviteLink(link || "");
      setInviteSuccess(`Invitation created for ${clean}. It expires in 7 days.`);
      setEmail("");
    } catch (error) {
      setInviteError(error.message || "Invitation could not be sent. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const steps = [
    user?.name || true,
    connectedChannels > 0,
    invites.length > 0,
  ];
  const done = steps.filter(Boolean).length;
  const input = `w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500 ${focusRing}`;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-cyan-500/20 bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950/50 p-6 sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-300">
              <Check className="h-3.5 w-3.5" aria-hidden="true" /> Workspace administrator active
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Build your customer operations team</h2>
            <p className="mt-3 text-sm text-slate-300">Connect your channels, invite teammates and oversee every conversation from one place.</p>
          </div>
          <div className="w-full max-w-xs rounded-2xl border border-white/10 bg-slate-950/50 p-4">
            <div className="flex items-center justify-between text-xs text-slate-400"><span>Setup progress</span><strong className="text-white">{done}/{steps.length}</strong></div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-cyan-400 transition-all" style={{ width: `${(done / steps.length) * 100}%` }} /></div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card title="Invite your team" icon={UserPlus}>
          <form onSubmit={submitInvite} className="space-y-3" noValidate>
            <div>
              <label htmlFor="invite-email" className="mb-1.5 block text-xs font-medium text-slate-400">Work email</label>
              <input id="invite-email" type="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teammate@company.com" className={input} />
            </div>
            <div>
              <label htmlFor="invite-role" className="mb-1.5 block text-xs font-medium text-slate-400">Workspace role</label>
              <select id="invite-role" value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} className={input}>
                {INVITABLE_ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <button type="submit" disabled={submitting} className={`inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-60 ${focusRing}`}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}Send invitation
            </button>
            <div aria-live="polite">
              {inviteError && <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">{inviteError}</p>}
              {inviteSuccess && <p className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">{inviteSuccess}</p>}
              {inviteLink && (
                <div className="mt-2 flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 p-2">
                  <input readOnly value={inviteLink} aria-label="Invite link" onFocus={(e) => e.target.select()} className="min-w-0 flex-1 bg-transparent text-xs text-slate-300 outline-none" />
                  <button type="button" onClick={copyLink} className={`shrink-0 rounded-md border border-slate-700 px-2.5 py-1 text-xs text-slate-200 hover:bg-white/5 ${focusRing}`}>
                    {copied ? "Copied" : "Copy link"}
                  </button>
                </div>
              )}
            </div>
          </form>
        </Card>

        <Card title="Pending invitations" icon={Mail} action={<span className="text-xs text-slate-400">{pending.length} pending</span>}>
          {invitesLoading ? (
            <div className="flex items-center justify-center py-8 text-xs text-slate-500"><Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />Loading…</div>
          ) : invites.length === 0 ? (
            <Empty icon={Users} title="No invitations yet" text="Invite an agent or manager to join your workspace." />
          ) : (
            <div className="max-h-72 space-y-3 overflow-y-auto">
              {invites.map((invite, i) => {
                const id = invite?.id || invite?.inviteId;
                const isPending = (invite?.status || "pending").toLowerCase() === "pending";
                return (
                  <div key={id ?? `${invite?.email}-${i}`} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/40 p-3 text-xs">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-white">{invite?.email}</p>
                      <p className="capitalize text-slate-400">{invite?.role} · {invite?.status || "pending"}</p>
                    </div>
                    {id && isPending && (
                      <button type="button" onClick={() => onRevoke(id)} disabled={revokeBusyId === id} className={`inline-flex items-center gap-1 rounded-lg border border-slate-700 px-2.5 py-1 text-slate-300 hover:border-red-500 hover:text-red-300 disabled:opacity-60 ${focusRing}`}>
                        {revokeBusyId === id ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> : <X className="h-3 w-3" aria-hidden="true" />}Revoke
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

/* ================= main dashboard ================= */

export default function WorkspaceDashboard({ view, role: suppliedRole, user: suppliedUser }) {
  const { user: authUser, role: authRole, isAuth, loading: authLoading } = useAuth();
  const role = suppliedRole || authRole;
  const user = suppliedUser || authUser;

  const [preview, setPreview] = useState(null);
  const [timeframe, setTimeframe] = useState("30d");
  const [metrics, setMetrics] = useState(null);
  const [health, setHealth] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [channels, setChannels] = useState({});
  const [invites, setInvites] = useState([]);
  const [invitesLoading, setInvitesLoading] = useState(false);
  const [revokeBusyId, setRevokeBusyId] = useState(null);

  const [demo, setDemo] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [failed, setFailed] = useState([]);
  const [actionError, setActionError] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  const controllerRef = useRef(null);

  const authorized = Boolean(isAuth && getToken() && role !== "guest");
  const ownView = ALIAS[role] || "agent";
  const allowed = ALLOWED[ownView] ?? ["agent"];
  const requested = preview ?? view ?? ownView;
  const current = allowed.includes(requested) ? requested : ownView;
  const canPreview = ownView === "admin";
  const isWorkspaceAdmin = ownView === "admin" && current === "admin";

  const { events = [], isConnected = false } = useAgentStream(API_ENDPOINTS.activityStream, { enabled: authorized });

  const loadInvites = useCallback(async (signal) => {
    if (!authorized || !isWorkspaceAdmin) return;
    setInvitesLoading(true);
    try {
      const data = await api(invitesRoot(), { signal });
      if (!signal?.aborted) setInvites(asList(data, ["items", "invites", "invitations"]));
    } catch (e) {
      if (!isAbortError(e)) console.warn("[Dashboard] Invitations unavailable:", e.message);
    } finally {
      if (!signal?.aborted) setInvitesLoading(false);
    }
  }, [authorized, isWorkspaceAdmin]);

  const createInvite = useCallback(async ({ email, role: inviteRole }) => {
    const data = await api(invitesRoot(), { method: "POST", body: { email, role: inviteRole } });
    await loadInvites();
    return data;
  }, [loadInvites]);

  const revokeInvite = useCallback(async (id) => {
    if (!id) return;
    setRevokeBusyId(id);
    setActionError(null);
    try {
      await api(inviteItemUrl(id), { method: "DELETE" });
      await loadInvites();
    } catch (e) {
      setActionError(e.message || "Invitation could not be revoked.");
    } finally {
      setRevokeBusyId(null);
    }
  }, [loadInvites]);

  const load = useCallback(async () => {
    if (!authorized) return;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const { signal } = controller;

    setRefreshing(true);
    const jobs = [
      ["metrics", () => api(API_ENDPOINTS.metrics(timeframe), { signal })],
      ["health", () => api(API_ENDPOINTS.health, { signal })],
      ["tickets", () => api(SUPPORTOPS_API.tickets("", { status: "open", limit: 10 }), { signal })],
      ["channels", () => api(SUPPORTOPS_API.tickets("/channels"), { signal })],
    ];

    const results = await Promise.allSettled(jobs.map(([, run]) => { try { return run(); } catch (e) { return Promise.reject(e); } }));
    if (signal.aborted) return;

    const bad = [];
    const pick = (i) => {
      const r = results[i];
      if (r.status === "fulfilled") return r.value;
      if (!isAbortError(r.reason)) bad.push({ name: jobs[i][0], status: r.reason?.status });
      return undefined;
    };

    const m = pick(0); if (m !== undefined) setMetrics(m);
    const h = pick(1); if (h !== undefined) setHealth(h);

    const t = pick(2);
    if (t !== undefined) {
      const list = asList(t, ["items", "tickets"]);
      const demoOn = import.meta.env.DEV && import.meta.env.VITE_SUPPORTOPS_DEMO === "true" && !list.length;
      setDemo(demoOn);
      setTickets(demoOn ? SAMPLE : list);
    }

    const c = pick(3);
    if (c !== undefined) {
      const raw = c?.channels ?? c ?? [];
      setChannels(Array.isArray(raw) ? Object.fromEntries(raw.filter((x) => x?.key).map((x) => [x.key, x])) : raw);
    }

    setFailed(bad);
    setUpdatedAt(Date.now());
    setLoaded(true);
    setRefreshing(false);
  }, [authorized, timeframe]);

  // initial load + reload on timeframe change
  useEffect(() => {
    if (authLoading || !authorized) return undefined;
    load();
    return () => controllerRef.current?.abort();
  }, [authLoading, authorized, load]);

  // keep SLA timers honest and refresh data quietly while the tab is visible
  useEffect(() => {
    if (!authorized) return undefined;
    const tick = setInterval(() => setNow(Date.now()), 30_000);
    const poll = setInterval(() => { if (document.visibilityState === "visible") load(); }, REFRESH_MS);
    return () => { clearInterval(tick); clearInterval(poll); };
  }, [authorized, load]);

  useEffect(() => {
    if (authLoading || !authorized || !isWorkspaceAdmin) return undefined;
    const controller = new AbortController();
    loadInvites(controller.signal);
    return () => controller.abort();
  }, [authLoading, authorized, isWorkspaceAdmin, loadInvites]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#030712] text-slate-300">
        <RefreshCw className="mr-3 h-6 w-6 animate-spin text-cyan-400" aria-hidden="true" />Checking your session…
      </div>
    );
  }
  if (!authorized) return <AccessRequired />;

  const sorted = [...tickets].sort((a, b) => (slaMins(a, now) ?? Number.MAX_SAFE_INTEGER) - (slaMins(b, now) ?? Number.MAX_SAFE_INTEGER));
  const atRisk = sorted.filter((t) => (slaMins(t, now) ?? Infinity) <= 60);
  const connected = Object.keys(CHANNELS).filter((k) => channels?.[k]?.connected).length;
  const sessionExpired = failed.length > 0 && failed.every((f) => f.status === 401);

  const kpis = ({
    agent: [
      ["Open tickets", sorted.length, "Assigned queue", Ticket],
      ["SLA at risk", atRisk.length, "Due within 60 min", AlertTriangle],
      ["Avg first response", val(metrics?.avgFirstResponseMin, (v) => `${v} min`), "This period", Clock],
      ["CSAT", val(metrics?.csat, (v) => `${v}%`), "Customer satisfaction", Sparkles],
    ],
    management: [
      ["Backlog", val(metrics?.backlog ?? sorted.length, fmt), "Open across channels", Inbox],
      ["SLA compliance", val(metrics?.slaCompliance, (v) => `${v}%`), "Resolved on time", CheckCircle2],
      ["Avg resolution", val(metrics?.avgResolutionHours, (v) => `${v} h`), "This period", Clock],
      ["AI resolution rate", val(metrics?.aiResolutionRate, (v) => `${v}%`), "Handled without an agent", Sparkles],
    ],
    admin: [
      ["Channels connected", `${connected}/${Object.keys(CHANNELS).length}`, "Configured channels", Plug],
      ["Seats used", val(metrics?.seatsUsed, (v) => `${v}${metrics?.seatLimit ? `/${metrics.seatLimit}` : ""}`), "Workspace seats", Users],
      ["Total tickets", val(metrics?.tickets, fmt), timeframe, Ticket],
      ["API latency", val(health?.apiLatencyMs, (v) => `${v} ms`), health?.uptime ?? "System", Activity],
    ],
    investor: [
      ["Monthly recurring revenue", val(metrics?.mrr, (v) => `$${fmt(v)}`), delta(metrics?.mrrChange), DollarSign],
      ["Active customers", val(metrics?.customers, fmt), delta(metrics?.customersChange), Users],
      ["Tickets handled", val(metrics?.tickets, fmt), delta(metrics?.ticketsChange), Ticket],
      ["AI resolution rate", val(metrics?.aiResolutionRate, (v) => `${v}%`), "Drives cost savings", Sparkles],
    ],
  })[current] ?? [];

  return (
    <div className="min-h-screen bg-[#030712] px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-1 text-xs text-slate-500">Welcome back{user?.name ? `, ${user.name}` : ""}</p>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{TITLES[current]?.[0] ?? "Dashboard"}</h1>
          <p className="text-sm text-slate-400">{TITLES[current]?.[1] ?? ""}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canPreview && (
            <div className="flex flex-wrap rounded-xl border border-slate-800 bg-slate-900 p-1" role="tablist" aria-label="Dashboard view">
              {Object.entries(VIEWS).map(([key, label]) => (
                <button key={key} type="button" role="tab" aria-selected={current === key} onClick={() => setPreview(key)} className={`rounded-lg px-3 py-1.5 text-xs transition ${focusRing} ${current === key ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"}`}>
                  {label}
                </button>
              ))}
            </div>
          )}
          <select aria-label="Timeframe" value={timeframe} onChange={(e) => setTimeframe(e.target.value)} className={`rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-300 ${focusRing}`}>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <button type="button" aria-label="Refresh dashboard" onClick={load} disabled={refreshing} className={`rounded-xl border border-slate-800 bg-slate-900 p-2 text-slate-300 hover:text-white disabled:opacity-60 ${focusRing}`}>
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} aria-hidden="true" />
          </button>
        </div>
      </div>

      <PlanBanner />

      <div aria-live="polite">
        {demo && <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">Showing sample tickets because your workspace has none yet.</div>}
        {actionError && <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{actionError}</div>}
        {failed.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            <span>
              {sessionExpired
                ? "Your session has expired. Sign in again to see live data."
                : `Couldn't load ${failed.map((f) => f.name).join(", ")}. Showing the last data we had.`}
            </span>
            {sessionExpired
              ? <Link to={ROUTES?.login || "/supportops/login"} className="font-semibold underline">Sign in</Link>
              : <button type="button" onClick={load} className="font-semibold underline">Retry</button>}
          </div>
        )}
      </div>

      {!loaded ? (
        <Skeleton />
      ) : (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {kpis.map(([label, value, hint, icon]) => <Kpi key={label} label={label} value={value} hint={hint} icon={icon} />)}
          </div>

          <Briefing current={current} tickets={sorted} now={now} metrics={metrics} connected={connected} totalChannels={Object.keys(CHANNELS).length} invites={invites} />

          {current === "agent" && (
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
              <div className="xl:col-span-2">
                <Card title="My priority queue" icon={Inbox}><TicketList tickets={sorted} now={now} /></Card>
              </div>
              <Card title="Live activity" icon={Activity} action={<span className={`text-[11px] ${isConnected ? "text-emerald-400" : "text-slate-500"}`}>{isConnected ? "Live" : "Offline"}</span>}>
                <LiveActivity events={events} />
              </Card>
            </div>
          )}

          {current === "management" && (
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
              <div className="space-y-6 xl:col-span-2">
                <Card title="Tickets at SLA risk" icon={AlertTriangle}><TicketList tickets={atRisk} now={now} /></Card>
                <Card title="Channel workload mix" icon={Inbox}><ChannelMix tickets={sorted} byChannel={metrics?.byChannel} /></Card>
              </div>
              <div className="space-y-6">
                <AIImpact timeframe={timeframe} />
                <Card title="Live activity" icon={Activity}><LiveActivity events={events} /></Card>
              </div>
            </div>
          )}

          {current === "admin" && (isWorkspaceAdmin ? (
            <div className="space-y-6">
              <ExecutiveOnboarding user={user} channels={channels} invites={invites} invitesLoading={invitesLoading} onInvite={createInvite} onRevoke={revokeInvite} revokeBusyId={revokeBusyId} />
              <Card title="Support channel integrations" icon={Plug}><ChannelConnections channels={channels} /></Card>
            </div>
          ) : (
            <Card title="Workspace administration" icon={ShieldCheck}>
              <p className="text-sm text-slate-400">Administrator tools are available only to workspace owners and authorized administrators.</p>
            </Card>
          ))}

          {current === "investor" && (
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
              <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-1 xl:col-span-2"><RevenueChart timeframe={timeframe} /></div>
              <AIImpact timeframe={timeframe} />
            </div>
          )}

          {updatedAt && <p className="mt-6 text-right text-[11px] text-slate-600">Updated {new Date(updatedAt).toLocaleTimeString()} · refreshes every minute</p>}
        </>
      )}
    </div>
  );
}