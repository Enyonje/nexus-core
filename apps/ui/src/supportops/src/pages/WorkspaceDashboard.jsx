// src/pages/WorkspaceDashboard.jsx

import React, {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";
import { Link, Navigate } from "react-router-dom";
import {
    MessageCircle,
    Phone,
    Mail,
    Smartphone,
    Globe,
    Share2,
    Clock,
    AlertTriangle,
    CheckCircle2,
    Users,
    DollarSign,
    Sparkles,
    Ticket,
    RefreshCw,
    Inbox,
    Activity,
    Plug,
    LockKeyhole,
    Building2,
    UserPlus,
    Send,
    X,
    Check,
    ArrowRight,
    ShieldCheck,
    Loader2,
} from "lucide-react";

import RevenueChart from "../components/RevenueChart";
import { PlanBanner } from "../components/Access";
import AIImpact from "../components/AIImpact";
import { useAgentStream } from "../hooks/useAgentStream";
import { API_ENDPOINTS, SUPPORTOPS_API, ROUTES } from "../config/paths";
import { useAuth } from "../context/AuthContext";

/* ---------- configuration ---------- */

const CHANNELS = {
    whatsapp: {
        label: "WhatsApp",
        icon: MessageCircle,
        tone: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    },
    voice: {
        label: "Phone",
        icon: Phone,
        tone: "text-sky-400 bg-sky-500/10 border-sky-500/20",
    },
    email: {
        label: "Email",
        icon: Mail,
        tone: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    },
    sms: {
        label: "SMS",
        icon: Smartphone,
        tone: "text-violet-400 bg-violet-500/10 border-violet-500/20",
    },
    web: {
        label: "Web chat",
        icon: Globe,
        tone: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
    },
    social: {
        label: "Social",
        icon: Share2,
        tone: "text-pink-400 bg-pink-500/10 border-pink-500/20",
    },
};

const VIEWS = {
    agent: "Agent",
    management: "Management",
    admin: "Admin",
    investor: "Investor",
};

const ALIAS = {
    user: "agent",
    agent: "agent",
    management: "management",
    admin: "admin",
    investor: "investor",
};

const TITLES = {
    agent: [
        "My queue",
        "Your tickets from every channel, most urgent first",
    ],
    management: [
        "Operations Overview",
        "Backlog, SLA health and workload across all channels",
    ],
    admin: [
        "Executive Command Center",
        "Set up your workspace, bring your team together and oversee customer operations",
    ],
    investor: [
        "Business Performance",
        "Revenue, growth and AI cost savings",
    ],
};

const SAMPLE = [
    {
        id: "T-1042",
        subject: "Payment failed twice at checkout",
        customer: "Amina K.",
        channel: "whatsapp",
        priority: "high",
        slaMins: 12,
    },
    {
        id: "T-1041",
        subject: "Missed call: delivery not received",
        customer: "Brian O.",
        channel: "voice",
        priority: "urgent",
        slaMins: -8,
    },
    {
        id: "T-1039",
        subject: "Invoice copy request",
        customer: "Nia Traders",
        channel: "email",
        priority: "low",
        slaMins: 190,
    },
    {
        id: "T-1037",
        subject: "Cannot reset password",
        customer: "Joy M.",
        channel: "web",
        priority: "normal",
        slaMins: 55,
    },
];

/* ---------- backend API configuration ---------- */

const API_BASE_URL = (
    import.meta.env.VITE_SUPPORTOPS_API_URL ||
    import.meta.env.VITE_BACKEND_API_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    "https://nexus-core-a0px.onrender.com"
).replace(/\/api\/?$/, "");

/* ---------- safe auth helper ---------- */

function useSafeAuth() {
    try {
        return useAuth();
    } catch (e) {
        return {
            user: null,
            role: null,
            isAuth: false,
            isAuthenticated: false,
            loading: false,
        };
    }
}

/* ---------- helpers ---------- */

function isAbortError(error) {
    return (
        error?.name === "AbortError" ||
        error?.name === "CanceledError" ||
        error?.code === "ERR_CANCELED" ||
        error?.code === "ABORT_ERR"
    );
}

async function getJSON(url, signal) {
    if (signal?.aborted) return null;

    const token =
        localStorage.getItem("token") ||
        localStorage.getItem("authToken") ||
        localStorage.getItem("access_token") ||
        localStorage.getItem("supportops_token");

    const org =
        localStorage.getItem("activeOrgId") ||
        localStorage.getItem("orgId");

    if (!token) return null;

    let fullUrl = url;
    if (url?.startsWith("/")) {
        let cleanEndpoint = url;
        if (cleanEndpoint !== "/api" && !cleanEndpoint.startsWith("/api/")) {
            cleanEndpoint = `/api${cleanEndpoint}`;
        }
        fullUrl = `${API_BASE_URL}${cleanEndpoint}`;
    }

    try {
        const response = await fetch(fullUrl, {
            method: "GET",
            signal,
            headers: {
                Authorization: `Bearer ${token}`,
                ...(org ? { "X-Org-Id": org } : {}),
                Accept: "application/json",
                "Content-Type": "application/json",
            },
        });

        if (response.status === 401 || response.status === 403) return null;
        if (!response.ok) throw new Error(`HTTP_${response.status}`);

        const text = await response.text();
        return text ? JSON.parse(text) : null;
    } catch (error) {
        if (isAbortError(error) || signal?.aborted) return null;
        console.warn(`[Dashboard] Request failed for ${url}:`, error.message);
        return null;
    }
}

async function requestJSON(url, { method = "GET", body, signal } = {}) {
    const token =
        localStorage.getItem("token") ||
        localStorage.getItem("authToken") ||
        localStorage.getItem("access_token") ||
        localStorage.getItem("supportops_token");
    const org =
        localStorage.getItem("activeOrgId") ||
        localStorage.getItem("orgId");

    if (!token) throw new Error("Your session has expired. Sign in again to continue.");

    const response = await fetch(url, {
        method,
        signal,
        headers: {
            Authorization: `Bearer ${token}`,
            ...(org ? { "X-Org-Id": org } : {}),
            "X-App-Slug": "supportops",
            Accept: "application/json",
            "Content-Type": "application/json",
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : {};
    if (!response.ok || data?.success === false) {
        throw new Error(data?.message || data?.error || `Request failed (${response.status})`);
    }
    return data;
}

const inviteList = (data) => {
    if (Array.isArray(data)) return data;
    return data?.items ?? data?.invites ?? data?.invitations ?? data?.data?.items ?? data?.data?.invites ?? [];
};

const toList = (data) => {
    if (Array.isArray(data)) return data;
    return data?.items ?? data?.tickets ?? data?.data ?? [];
};

const val = (value, format = (x) => x) =>
    value === undefined || value === null ? "—" : format(value);

const slaMins = (ticket) =>
    typeof ticket?.slaMins === "number"
        ? ticket.slaMins
        : ticket?.slaDueAt
            ? Math.round((new Date(ticket.slaDueAt).getTime() - Date.now()) / 60000)
            : null;

/* ---------- shared UI components ---------- */

function SlaPill({ mins }) {
    if (mins === null) return <span className="text-[11px] text-slate-500">No SLA</span>;

    const className =
        mins < 0
            ? "text-red-300 bg-red-500/10 border-red-500/30"
            : mins <= 60
                ? "text-amber-300 bg-amber-500/10 border-amber-500/30"
                : "text-slate-300 bg-slate-500/10 border-slate-500/30";

    const label =
        mins < 0
            ? `Breached ${Math.abs(mins)}m`
            : mins < 120
                ? `${mins}m left`
                : `${Math.round(mins / 60)}h left`;

    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-medium ${className}`}>
            <Clock className="h-3 w-3" />
            {label}
        </span>
    );
}

function ChannelBadge({ channel }) {
    const config = CHANNELS[channel] ?? CHANNELS.web;
    const Icon = config.icon;

    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] ${config.tone}`}>
            <Icon className="h-3 w-3" />
            {config.label}
        </span>
    );
}

function Card({ title, icon: Icon, action, children, className = "" }) {
    return (
        <section className={`rounded-2xl bg-slate-900/40 border border-slate-800/80 p-5 backdrop-blur-xl ${className}`}>
            <header className="flex items-center justify-between mb-4">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
                    <Icon className="h-4 w-4 text-cyan-400" />
                    {title}
                </h2>
                {action}
            </header>
            {children}
        </section>
    );
}

function Kpi({ label, value, hint, icon: Icon }) {
    return (
        <div className="rounded-2xl bg-slate-900/40 border border-slate-800/80 p-5">
            <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-slate-400">{label}</span>
                <span className="p-2 rounded-lg bg-white/5 border border-white/10">
                    <Icon className="h-4 w-4 text-cyan-400" />
                </span>
            </div>
            <div className="text-3xl font-extrabold tracking-tight text-white">{value}</div>
            {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
        </div>
    );
}

function Empty({ icon: Icon, title, text }) {
    return (
        <div className="py-10 text-center">
            <Icon className="h-8 w-8 mx-auto mb-2 text-slate-600" />
            <p className="text-sm font-medium text-slate-300">{title}</p>
            <p className="text-xs text-slate-500 mt-1">{text}</p>
        </div>
    );
}

function AccessRequired() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-[#030712] px-6 text-slate-100">
            <div className="max-w-md w-full rounded-2xl border border-slate-800 bg-slate-900/70 p-8 text-center">
                <LockKeyhole className="h-10 w-10 mx-auto mb-4 text-cyan-400" />
                <h1 className="text-2xl font-bold text-white">Sign in to continue</h1>
                <p className="mt-3 text-sm leading-6 text-slate-400">
                    Dashboard data, tickets, and workspace activity are available to authorized team members only.
                </p>
                <Link
                    to={ROUTES?.login || "/supportops/login"}
                    className="mt-6 inline-flex items-center justify-center rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500"
                >
                    Sign in
                </Link>
            </div>
        </div>
    );
}

/* ---------- sub-panels ---------- */

function TicketList({ tickets = [] }) {
    const safeTickets = Array.isArray(tickets) ? tickets : [];
    if (!safeTickets.length) {
        return (
            <Empty
                icon={CheckCircle2}
                title="No open tickets"
                text="New tickets will appear here when they arrive."
            />
        );
    }

    return (
        <ul className="divide-y divide-slate-800/80">
            {safeTickets.map((ticket) => (
                <li key={ticket?.id || Math.random()} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <ChannelBadge channel={ticket?.channel} />
                            <span className="text-[11px] font-mono text-slate-500">{ticket?.id}</span>
                            {["urgent", "high"].includes(ticket?.priority) && (
                                <span className="text-[11px] font-semibold text-red-400 uppercase">
                                    {ticket?.priority}
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-slate-100 truncate">{ticket?.subject}</p>
                        <p className="text-xs text-slate-500">{ticket?.customer}</p>
                    </div>
                    <SlaPill mins={slaMins(ticket)} />
                </li>
            ))}
        </ul>
    );
}

function ChannelMix({ tickets = [], byChannel }) {
    const counts = useMemo(() => {
        if (byChannel) return byChannel;
        const safeTickets = Array.isArray(tickets) ? tickets : [];
        return safeTickets.reduce(
            (result, ticket) => ({
                ...result,
                [ticket?.channel || "web"]: (result[ticket?.channel || "web"] ?? 0) + 1,
            }),
            {}
        );
    }, [tickets, byChannel]);

    const total = Object.values(counts).reduce((sum, count) => sum + Number(count || 0), 0);

    if (!total) {
        return (
            <Empty
                icon={Inbox}
                title="No volume yet"
                text="Channel statistics appear when ticket data is available."
            />
        );
    }

    return (
        <ul className="space-y-3">
            {Object.entries(counts).map(([channel, count]) => (
                <li key={channel}>
                    <div className="flex justify-between text-xs mb-1">
                        <ChannelBadge channel={channel} />
                        <span className="text-slate-400">
                            {count} · {Math.round((count / total) * 100)}%
                        </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-800">
                        <div
                            className="h-full rounded-full bg-cyan-500"
                            style={{ width: `${(count / total) * 100}%` }}
                        />
                    </div>
                </li>
            ))}
        </ul>
    );
}

function ChannelConnections({ channels = {} }) {
    const safeChannels = channels || {};
    return (
        <ul className="grid sm:grid-cols-2 gap-3">
            {Object.entries(CHANNELS).map(([key, channel]) => {
                const Icon = channel.icon;
                const connected = Boolean(safeChannels[key]?.connected);

                return (
                    <li key={key} className="flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-slate-800/20">
                        <div className="flex items-center gap-3">
                            <span className={`p-2 rounded-lg border ${channel.tone}`}>
                                <Icon className="h-4 w-4" />
                            </span>
                            <div>
                                <p className="text-sm text-slate-100">{channel.label}</p>
                                <p className={`text-[11px] ${connected ? "text-emerald-400" : "text-slate-500"}`}>
                                    {connected ? "Connected" : "Not connected"}
                                </p>
                            </div>
                        </div>
                        <Link
                            to={ROUTES?.admin?.channels || "/supportops/admin/channels"}
                            className="px-3 py-1.5 rounded-lg text-xs border border-slate-700 text-slate-200 hover:bg-white/5"
                        >
                            {connected ? "Manage" : "Connect"}
                        </Link>
                    </li>
                );
            })}
        </ul>
    );
}

function LiveActivity({ events = [] }) {
    const safeEvents = Array.isArray(events) ? events : [];
    if (!safeEvents.length) {
        return (
            <Empty
                icon={Activity}
                title="No recent activity"
                text="New agent and AI activity will appear here."
            />
        );
    }

    return (
        <ul className="space-y-2">
            {safeEvents.slice(0, 5).map((event, index) => (
                <li key={event?.id || index} className="flex items-center gap-2 text-xs text-slate-300 p-2 rounded-lg bg-slate-800/30">
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
                    <span className="truncate">{event?.description || "Activity recorded"}</span>
                </li>
            ))}
        </ul>
    );
}

/* ---------- executive onboarding and team invitations ---------- */

const INVITABLE_ROLES = [
    { value: "agent", label: "Support agent", description: "Works customer conversations and tickets." },
    { value: "management", label: "Manager", description: "Oversees teams, queues and service performance." },
    { value: "investor", label: "Investor", description: "Views business and performance reporting." },
];

function formatInviteDate(value) {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? "—"
        : date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function ExecutiveOnboarding({ user, channels = {}, invites = [], invitesLoading, onInvite, onRevoke, inviteBusy, revokeBusyId }) {
    const [email, setEmail] = useState("");
    const [inviteRole, setInviteRole] = useState("agent");
    const [inviteError, setInviteError] = useState("");
    const [inviteSuccess, setInviteSuccess] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const safeChannels = channels || {};
    const safeInvites = Array.isArray(invites) ? invites : [];
    const connectedChannels = Object.values(safeChannels).filter((item) => item?.connected).length;
    const pendingInvites = safeInvites.filter((invite) => (invite?.status || "pending").toLowerCase() === "pending");

    async function submitInvite(event) {
        event.preventDefault();
        setInviteError("");
        setInviteSuccess("");
        const cleanEmail = email.trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
            setInviteError("Enter a valid email address.");
            return;
        }
        setSubmitting(true);
        try {
            await onInvite({ email: cleanEmail, role: inviteRole });
            setInviteSuccess(`Invitation sent to ${cleanEmail}. It expires in 7 days.`);
            setEmail("");
        } catch (error) {
            setInviteError(error.message || "Invitation could not be sent.");
        } finally {
            setSubmitting(false);
        }
    }

    const steps = [
        { title: "Workspace administrator", detail: user?.name ? `${user.name} is the workspace owner` : "Your administrator account is active", done: true, icon: ShieldCheck },
        { title: "Connect a support channel", detail: connectedChannels ? `${connectedChannels} channel(s) connected` : "Connect email, WhatsApp, voice or web chat", done: connectedChannels > 0, href: ROUTES?.admin?.channels || "/supportops/admin/channels", icon: Plug },
        { title: "Invite your team", detail: safeInvites.length ? `${safeInvites.length} invitation(s) created` : "Add agents, managers and investor viewers", done: safeInvites.length > 0, icon: Users },
    ];
    const completedSteps = steps.filter((step) => step.done).length;

    return (
        <div className="space-y-6">
            <section className="relative overflow-hidden rounded-3xl border border-cyan-500/20 bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950/50 p-6 sm:p-8">
                <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                    <div className="max-w-2xl">
                        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-300">
                            <Check className="h-3.5 w-3.5" /> Workspace administrator active
                        </div>
                        <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Build your customer operations team.</h2>
                        <p className="mt-3 text-sm text-slate-300">Connect support channels, invite teammates, and oversee all workspace operations from one center.</p>
                    </div>
                    <div className="w-full max-w-xs rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                        <div className="flex items-center justify-between text-xs text-slate-400"><span>Setup progress</span><strong className="text-white">{completedSteps}/{steps.length}</strong></div>
                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-cyan-400 transition-all" style={{ width: `${(completedSteps / steps.length) * 100}%` }} /></div>
                    </div>
                </div>
            </section>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <Card title="Invite your team" icon={UserPlus}>
                    <form onSubmit={submitInvite} className="space-y-3">
                        <div>
                            <label className="block mb-1.5 text-xs font-medium text-slate-400">Work email</label>
                            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teammate@company.com" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500" />
                        </div>
                        <div>
                            <label className="block mb-1.5 text-xs font-medium text-slate-400">Workspace role</label>
                            <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500">
                                {INVITABLE_ROLES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                            </select>
                        </div>
                        <button type="submit" disabled={submitting || inviteBusy} className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-60">
                            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Send invitation
                        </button>
                        {inviteError && <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">{inviteError}</p>}
                        {inviteSuccess && <p className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">{inviteSuccess}</p>}
                    </form>
                </Card>

                <Card title="Pending invitations" icon={Mail} action={<span className="text-xs text-slate-400">{pendingInvites.length} pending</span>}>
                    {invitesLoading ? (
                        <div className="flex items-center justify-center py-8 text-xs text-slate-500"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading invitations…</div>
                    ) : safeInvites.length === 0 ? (
                        <Empty icon={Users} title="No invites sent" text="Invite agents, managers, or investors to join your workspace." />
                    ) : (
                        <div className="space-y-3 max-h-72 overflow-y-auto">
                            {safeInvites.map((invite) => {
                                const id = invite?.id || invite?.inviteId;
                                return (
                                    <div key={id || invite?.email} className="flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-slate-950/40 text-xs">
                                        <div>
                                            <p className="font-medium text-white">{invite?.email}</p>
                                            <p className="text-slate-400 capitalize">Role: {invite?.role}</p>
                                        </div>
                                        {id && (
                                            <button type="button" onClick={() => onRevoke(id)} disabled={revokeBusyId === id} className="px-2.5 py-1 rounded-lg border border-slate-700 text-slate-300 hover:border-red-500 hover:text-red-300">
                                                {revokeBusyId === id ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />} Revoke
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

/* ---------- main export ---------- */

export default function WorkspaceDashboard({ view, role: suppliedRole, user: suppliedUser }) {
    const auth = useSafeAuth();

    const role = suppliedRole || auth?.role;
    const user = suppliedUser || auth?.user;
    const isAuth = auth?.isAuth || auth?.isAuthenticated || false;
    const authLoading = auth?.loading || auth?.isLoading || false;

    const [preview, setPreview] = useState(null);
    const [timeframe, setTimeframe] = useState("30d");

    const [metrics, setMetrics] = useState(null);
    const [health, setHealth] = useState(null);
    const [tickets, setTickets] = useState([]);
    const [channels, setChannels] = useState({});
    const [invites, setInvites] = useState([]);
    const [invitesLoading, setInvitesLoading] = useState(false);
    const [inviteBusy, setInviteBusy] = useState(false);
    const [revokeBusyId, setRevokeBusyId] = useState(null);

    const [demo, setDemo] = useState(false);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);

    const tokenPresent = typeof window !== "undefined" && Boolean(localStorage.getItem("token") || localStorage.getItem("authToken") || localStorage.getItem("access_token") || localStorage.getItem("supportops_token"));
    const authorized = Boolean(isAuth && tokenPresent && role !== "guest");
    const normalizedRole = ALIAS[role] || "agent";
    const current = preview ?? view ?? normalizedRole;
    const canPreview = role === "admin";

    const allowedViews = {
        agent: ["agent"],
        user: ["agent"],
        management: ["management"],
        investor: ["investor"],
        admin: ["admin", "agent", "management", "investor"],
    };

    const hasViewPermission = allowedViews[role]?.includes(current) ?? false;
    const isWorkspaceAdmin = normalizedRole === "admin" && current === "admin";

    const loadInvites = useCallback(async (signal) => {
        if (!authorized || !isWorkspaceAdmin) return;
        setInvitesLoading(true);
        try {
            const data = await getJSON(SUPPORTOPS_API.invites(""), signal);
            if (!signal?.aborted) setInvites(inviteList(data));
        } catch (inviteLoadError) {
            if (!isAbortError(inviteLoadError)) {
                console.warn("[Dashboard] Invitation list unavailable:", inviteLoadError.message);
            }
        } finally {
            if (!signal?.aborted) setInvitesLoading(false);
        }
    }, [authorized, isWorkspaceAdmin]);

    const createInvite = useCallback(async ({ email, role: inviteRole }) => {
        setInviteBusy(true);
        try {
            await requestJSON(SUPPORTOPS_API.invites(""), {
                method: "POST",
                body: { email, role: inviteRole },
            });
            await loadInvites();
        } finally {
            setInviteBusy(false);
        }
    }, [loadInvites]);

    const revokeInvite = useCallback(async (inviteId) => {
        if (!inviteId) return;
        setRevokeBusyId(inviteId);
        try {
            await requestJSON(`${SUPPORTOPS_API.invites.root}/${encodeURIComponent(inviteId)}`, {
                method: "DELETE",
            });
            await loadInvites();
        } catch (revokeError) {
            setError(revokeError.message || "Invitation could not be revoked.");
        } finally {
            setRevokeBusyId(null);
        }
    }, [loadInvites]);

    const { events = [], isConnected = false } = useAgentStream(API_ENDPOINTS.activityStream, {
        enabled: authorized && hasViewPermission,
    });

    const load = useCallback(async (signal) => {
        if (!authorized || !hasViewPermission) {
            setLoading(false);
            setRefreshing(false);
            return;
        }

        setLoading(true);
        setRefreshing(true);
        setError(null);

        try {
            const results = await Promise.all([
                getJSON(API_ENDPOINTS.metrics(timeframe), signal),
                getJSON(API_ENDPOINTS.health, signal),
                getJSON(SUPPORTOPS_API.tickets("", { status: "open", limit: 10 }), signal),
                getJSON(SUPPORTOPS_API.tickets("/channels"), signal),
            ]);

            if (signal?.aborted) return;

            const [metricsData, healthData, ticketData, channelData] = results;

            setMetrics(metricsData);
            setHealth(healthData);

            const list = ticketData ? toList(ticketData) : [];
            const safeList = Array.isArray(list) ? list : [];

            const demoEnabled = import.meta.env.DEV && import.meta.env.VITE_SUPPORTOPS_DEMO === "true";
            setDemo(demoEnabled && !safeList.length);

            const visibleTickets = demoEnabled && !safeList.length ? SAMPLE : safeList;

            setTickets(
                [...visibleTickets].sort(
                    (a, b) => (slaMins(a) ?? Number.MAX_SAFE_INTEGER) - (slaMins(b) ?? Number.MAX_SAFE_INTEGER)
                )
            );

            const rawChannels = channelData ? channelData.channels ?? channelData : [];
            setChannels(
                Array.isArray(rawChannels)
                    ? Object.fromEntries(rawChannels.map((channel) => [channel?.key, channel]))
                    : rawChannels ?? {}
            );
        } catch (loadError) {
            if (!isAbortError(loadError)) {
                setError("Unable to load workspace data. Please try again.");
            }
        } finally {
            if (!signal?.aborted) {
                setLoading(false);
                setRefreshing(false);
            }
        }
    }, [authorized, hasViewPermission, timeframe]);

    useEffect(() => {
        if (authLoading || !authorized || !hasViewPermission) return undefined;
        const controller = new AbortController();
        load(controller.signal);
        return () => controller.abort();
    }, [authLoading, authorized, hasViewPermission, load]);

    useEffect(() => {
        if (!authLoading && authorized && isWorkspaceAdmin) {
            const controller = new AbortController();
            loadInvites(controller.signal);
            return () => controller.abort();
        }
        return undefined;
    }, [authLoading, authorized, isWorkspaceAdmin, loadInvites]);

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#030712] text-slate-300">
                <RefreshCw className="h-6 w-6 animate-spin mr-3 text-cyan-400" />
                Checking your session…
            </div>
        );
    }

    if (!authorized) return <AccessRequired />;

    if (!hasViewPermission) {
        const destination = role === "admin" ? "/supportops/admin" : "/supportops/agent/dashboard";
        return <Navigate to={destination} replace />;
    }

    const safeTickets = Array.isArray(tickets) ? tickets : [];
    const atRisk = safeTickets.filter((ticket) => (slaMins(ticket) ?? Infinity) <= 60);
    const safeChannels = channels || {};
    const connected = Object.keys(CHANNELS).filter((key) => safeChannels[key]?.connected).length;

    const kpis = {
        agent: [
            ["Open tickets", safeTickets.length, "Assigned queue", Ticket],
            ["SLA at risk", atRisk.length, "Due within 60 min", AlertTriangle],
            ["Avg first response", val(metrics?.avgFirstResponseMin, (v) => `${v} min`), "This period", Clock],
            ["CSAT", val(metrics?.csat, (v) => `${v}%`), "Customer satisfaction", Sparkles],
        ],
        management: [
            ["Backlog", val(metrics?.backlog ?? safeTickets.length), "Open across channels", Inbox],
            ["SLA compliance", val(metrics?.slaCompliance, (v) => `${v}%`), "Resolved on time", CheckCircle2],
            ["Avg resolution", val(metrics?.avgResolutionHours, (v) => `${v} h`), "This period", Clock],
            ["AI resolution rate", val(metrics?.aiResolutionRate, (v) => `${v}%`), "Handled without agent", Sparkles],
        ],
        admin: [
            ["Channels connected", `${connected}/${Object.keys(CHANNELS).length}`, "Configured channels", Plug],
            ["Seats used", val(metrics?.seatsUsed, (v) => `${v}${metrics?.seatLimit ? `/${metrics.seatLimit}` : ""}`), "Workspace seats", Users],
            ["Total tickets", val(metrics?.tickets, (v) => v.toLocaleString()), timeframe, Ticket],
            ["API latency", val(health?.apiLatencyMs, (v) => `${v} ms`), health?.uptime ?? "System health", Activity],
        ],
        investor: [
            ["Monthly recurring revenue", val(metrics?.mrr, (v) => `$${v.toLocaleString()}`), metrics?.mrrChange, DollarSign],
            ["Active customers", val(metrics?.customers, (v) => v.toLocaleString()), metrics?.customersChange, Users],
            ["Tickets handled", val(metrics?.tickets, (v) => v.toLocaleString()), metrics?.ticketsChange, Ticket],
            ["AI resolution rate", val(metrics?.aiResolutionRate, (v) => `${v}%`), "Cost savings", Sparkles],
        ],
    }[current] || [];

    return (
        <div className="min-h-screen bg-[#030712] text-slate-100 px-4 sm:px-6 lg:px-8 py-8">
            {/* Header & Role Selector */}
            <div className="mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                <div>
                    <p className="text-xs text-slate-500 mb-1">Welcome back{user?.name ? `, ${user.name}` : ""}</p>
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{TITLES[current]?.[0] || "Dashboard"}</h1>
                    <p className="text-sm text-slate-400">{TITLES[current]?.[1] || ""}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {canPreview && (
                        <div className="flex flex-wrap rounded-xl border border-slate-800 bg-slate-900 p-1">
                            {Object.entries(VIEWS).map(([key, label]) => (
                                <button key={key} type="button" onClick={() => setPreview(key)} className={`px-3 py-1.5 text-xs rounded-lg transition ${current === key ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"}`}>
                                    {label}
                                </button>
                            ))}
                        </div>
                    )}

                    <select value={timeframe} onChange={(e) => setTimeframe(e.target.value)} className="px-3 py-2 text-xs bg-slate-900 border border-slate-800 rounded-xl text-slate-300">
                        <option value="7d">Last 7 days</option>
                        <option value="30d">Last 30 days</option>
                        <option value="90d">Last 90 days</option>
                    </select>

                    <button type="button" onClick={() => load(new AbortController().signal)} disabled={refreshing} className="p-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-300">
                        <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                    </button>
                </div>
            </div>

            <PlanBanner />

            {error && <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}

            {loading ? (
                <div className="flex items-center justify-center py-24 text-slate-400">
                    <RefreshCw className="h-6 w-6 animate-spin mr-3 text-cyan-400" />
                    Loading your workspace…
                </div>
            ) : (
                <>
                    {/* KPI Cards Header */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
                        {kpis.map(([label, value, hint, icon]) => (
                            <Kpi key={label} label={label} value={value} hint={hint} icon={icon} />
                        ))}
                    </div>

                    {/* AGENT VIEW */}
                    {current === "agent" && (
                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                            <div className="xl:col-span-2">
                                <Card title="My priority queue" icon={Inbox}>
                                    <TicketList tickets={safeTickets} />
                                </Card>
                            </div>
                            <div>
                                <Card title="Live activity stream" icon={Activity} action={<span className={`text-[11px] ${isConnected ? "text-emerald-400" : "text-slate-500"}`}>{isConnected ? "Live" : "Offline"}</span>}>
                                    <LiveActivity events={events} />
                                </Card>
                            </div>
                        </div>
                    )}

                    {/* MANAGEMENT VIEW */}
                    {current === "management" && (
                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                            <div className="xl:col-span-2 space-y-6">
                                <Card title="Tickets at SLA risk" icon={AlertTriangle}>
                                    <TicketList tickets={atRisk} />
                                </Card>
                                <Card title="Channel workload mix" icon={Inbox}>
                                    <ChannelMix tickets={safeTickets} byChannel={metrics?.byChannel} />
                                </Card>
                            </div>
                            <div className="space-y-6">
                                <AIImpact timeframe={timeframe} />
                                <Card title="Live activity" icon={Activity}>
                                    <LiveActivity events={events} />
                                </Card>
                            </div>
                        </div>
                    )}

                    {/* ADMIN VIEW */}
                    {current === "admin" && isWorkspaceAdmin && (
                        <div className="space-y-6">
                            <ExecutiveOnboarding user={user} channels={channels} invites={invites} invitesLoading={invitesLoading} onInvite={createInvite} onRevoke={revokeInvite} inviteBusy={inviteBusy} revokeBusyId={revokeBusyId} />
                            <Card title="Support channel integrations" icon={Plug}>
                                <ChannelConnections channels={channels} />
                            </Card>
                        </div>
                    )}

                    {current === "admin" && !isWorkspaceAdmin && (
                        <Card title="Workspace administration" icon={ShieldCheck}>
                            <p className="text-sm text-slate-400">Administrator tools are available only to the workspace owner or authorized administrators.</p>
                        </Card>
                    )}

                    {/* INVESTOR VIEW */}
                    {current === "investor" && (
                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                            <div className="xl:col-span-2">
                                <div className="rounded-2xl bg-slate-900/40 border border-slate-800/80 p-1">
                                    <RevenueChart timeframe={timeframe} />
                                </div>
                            </div>
                            <div>
                                <AIImpact timeframe={timeframe} />
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}