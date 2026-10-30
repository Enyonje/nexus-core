// src/pages/Dashboard.jsx

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
  Zap,
  LockKeyhole,
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
    "Operations",
    "Backlog, SLA health and workload across all channels",
  ],
  admin: [
    "Workspace admin",
    "Channels, integrations, seats and system health",
  ],
  investor: [
    "Business performance",
    "Revenue, growth and what AI is saving",
  ],
};

/**
 * Demo tickets are used only when explicitly enabled.
 * Never silently substitute fake business data after an API failure.
 */
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

/* ---------- backend configuration ---------- */

const API_BASE_URL = (
  import.meta.env.VITE_BACKEND_API_URL ||
  import.meta.env.VITE_API_URL ||
  "https://nexus-core-a0px.onrender.com"
).replace(/\/api\/?$/, "");

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
  if (signal?.aborted) {
    return null;
  }

  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("access_token");

  const org =
    localStorage.getItem("activeOrgId") ||
    localStorage.getItem("orgId");

  // Never make a protected request without a session token.
  if (!token) {
    return null;
  }

  let fullUrl = url;

  if (url?.startsWith("/")) {
    let cleanEndpoint = url;

    if (
      cleanEndpoint !== "/api" &&
      !cleanEndpoint.startsWith("/api/")
    ) {
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

    if (response.status === 401) {
      // Let the central authentication provider handle session expiry.
      // Do not dispatch another unauthorized event here.
      return null;
    }

    if (response.status === 403) {
      console.warn(
        `[Dashboard] Access denied for ${url}. Check the user's role and permissions.`
      );
      return null;
    }

    if (!response.ok) {
      throw new Error(`HTTP_${response.status}`);
    }

    return await response.json();
  } catch (error) {
    if (isAbortError(error) || signal?.aborted) {
      return null;
    }

    console.warn(
      `[Dashboard] Request failed for ${url}:`,
      error.message
    );

    return null;
  }
}

const toList = (data) =>
  Array.isArray(data)
    ? data
    : data?.items ?? data?.tickets ?? [];

const val = (value, format = (x) => x) =>
  value === undefined || value === null
    ? "—"
    : format(value);

const slaMins = (ticket) =>
  typeof ticket.slaMins === "number"
    ? ticket.slaMins
    : ticket.slaDueAt
      ? Math.round(
        (new Date(ticket.slaDueAt).getTime() - Date.now()) /
        60000
      )
      : null;

/* ---------- shared UI components ---------- */

function SlaPill({ mins }) {
  if (mins === null) {
    return (
      <span className="text-[11px] text-slate-500">
        No SLA
      </span>
    );
  }

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
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-medium ${className}`}
    >
      <Clock className="h-3 w-3" />
      {label}
    </span>
  );
}

function ChannelBadge({ channel }) {
  const config = CHANNELS[channel] ?? CHANNELS.web;
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] ${config.tone}`}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}

function Card({
  title,
  icon: Icon,
  action,
  children,
  className = "",
}) {
  return (
    <section
      className={`rounded-2xl bg-slate-900/40 border border-slate-800/80 p-5 backdrop-blur-xl ${className}`}
    >
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
        <span className="text-xs font-medium text-slate-400">
          {label}
        </span>

        <span className="p-2 rounded-lg bg-white/5 border border-white/10">
          <Icon className="h-4 w-4 text-cyan-400" />
        </span>
      </div>

      <div className="text-3xl font-extrabold tracking-tight text-white">
        {value}
      </div>

      {hint && (
        <div className="mt-1 text-xs text-slate-500">
          {hint}
        </div>
      )}
    </div>
  );
}

function Empty({ icon: Icon, title, text }) {
  return (
    <div className="py-10 text-center">
      <Icon className="h-8 w-8 mx-auto mb-2 text-slate-600" />

      <p className="text-sm font-medium text-slate-300">
        {title}
      </p>

      <p className="text-xs text-slate-500 mt-1">
        {text}
      </p>
    </div>
  );
}

function AccessRequired() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#030712] px-6 text-slate-100">
      <div className="max-w-md w-full rounded-2xl border border-slate-800 bg-slate-900/70 p-8 text-center">
        <LockKeyhole className="h-10 w-10 mx-auto mb-4 text-cyan-400" />

        <h1 className="text-2xl font-bold text-white">
          Sign in to continue
        </h1>

        <p className="mt-3 text-sm leading-6 text-slate-400">
          Dashboard data, tickets, and workspace activity are
          available to authorized team members only.
        </p>

        <Link
          to={ROUTES?.login || "/supportops/login"}
          className="mt-6 inline-flex items-center justify-center rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500"
        >
          Sign in
        </Link>

        <Link
          to="/supportops"
          className="mt-4 block text-sm text-slate-400 hover:text-white"
        >
          Return to website
        </Link>
      </div>
    </div>
  );
}

/* ---------- dashboard panels ---------- */

function TicketList({ tickets }) {
  if (!tickets.length) {
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
      {tickets.map((ticket) => (
        <li
          key={ticket.id}
          className="py-3 flex items-center justify-between gap-3"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <ChannelBadge channel={ticket.channel} />

              <span className="text-[11px] font-mono text-slate-500">
                {ticket.id}
              </span>

              {["urgent", "high"].includes(ticket.priority) && (
                <span className="text-[11px] font-semibold text-red-400 uppercase">
                  {ticket.priority}
                </span>
              )}
            </div>

            <p className="text-sm text-slate-100 truncate">
              {ticket.subject}
            </p>

            <p className="text-xs text-slate-500">
              {ticket.customer}
            </p>
          </div>

          <SlaPill mins={slaMins(ticket)} />
        </li>
      ))}
    </ul>
  );
}

function ChannelMix({ tickets, byChannel }) {
  const counts = useMemo(() => {
    if (byChannel) {
      return byChannel;
    }

    return tickets.reduce(
      (result, ticket) => ({
        ...result,
        [ticket.channel]:
          (result[ticket.channel] ?? 0) + 1,
      }),
      {}
    );
  }, [tickets, byChannel]);

  const total = Object.values(counts).reduce(
    (sum, count) => sum + Number(count || 0),
    0
  );

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
              style={{
                width: `${(count / total) * 100}%`,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function ChannelConnections({ channels }) {
  return (
    <ul className="grid sm:grid-cols-2 gap-3">
      {Object.entries(CHANNELS).map(([key, channel]) => {
        const Icon = channel.icon;
        const connected = Boolean(
          channels[key]?.connected
        );

        return (
          <li
            key={key}
            className="flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-slate-800/20"
          >
            <div className="flex items-center gap-3">
              <span
                className={`p-2 rounded-lg border ${channel.tone}`}
              >
                <Icon className="h-4 w-4" />
              </span>

              <div>
                <p className="text-sm text-slate-100">
                  {channel.label}
                </p>

                <p
                  className={`text-[11px] ${connected
                    ? "text-emerald-400"
                    : "text-slate-500"
                    }`}
                >
                  {connected ? "Connected" : "Not connected"}
                </p>
              </div>
            </div>

            <Link
              to={
                ROUTES?.admin?.channels ||
                "/supportops/admin/channels"
              }
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

function LiveActivity({ events }) {
  if (!events.length) {
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
      {events.slice(0, 5).map((event, index) => (
        <li
          key={event.id || index}
          className="flex items-center gap-2 text-xs text-slate-300 p-2 rounded-lg bg-slate-800/30"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />

          <span className="truncate">
            {event.description}
          </span>
        </li>
      ))}
    </ul>
  );
}

/* ---------- main dashboard ---------- */

export default function WorkspaceDashboard({
  view,
  role: suppliedRole,
  user: suppliedUser,
}) {
  const {
    user: authUser,
    role: authRole,
    isAuth,
    loading: authLoading,
  } = useAuth();

  const role = suppliedRole || authRole;
  const user = suppliedUser || authUser;

  const [preview, setPreview] = useState(null);
  const [timeframe, setTimeframe] = useState("30d");

  const [metrics, setMetrics] = useState(null);
  const [health, setHealth] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [channels, setChannels] = useState({});

  const [demo, setDemo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const tokenPresent =
    typeof window !== "undefined" &&
    Boolean(
      localStorage.getItem("token") ||
      localStorage.getItem("authToken") ||
      localStorage.getItem("access_token")
    );

  const authorized =
    Boolean(isAuth && tokenPresent && role !== "guest");

  const normalizedRole = ALIAS[role] || "agent";

  // Administrators can preview other views without changing their actual role.
  const current = preview ?? view ?? normalizedRole;

  const canPreview = role === "admin";

  const allowedViews = {
    agent: ["agent"],
    user: ["agent"],
    management: ["management"],
    investor: ["investor"],
    admin: ["admin", "agent", "management", "investor"],
  };

  const hasViewPermission =
    allowedViews[role]?.includes(current) ?? false;

  /*
   * IMPORTANT:
   * Do not create a live stream for guests or unauthorized users.
   *
   * This requires useAgentStream to support an `enabled` option.
   * The updated hook is provided below.
   */
  const {
    events = [],
    isConnected = false,
  } = useAgentStream(API_ENDPOINTS.activityStream, {
    enabled: authorized && hasViewPermission,
  });

  const load = useCallback(
    async (signal) => {
      if (!authorized || !hasViewPermission) {
        setMetrics(null);
        setHealth(null);
        setTickets([]);
        setChannels({});
        setDemo(false);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      setLoading(true);
      setRefreshing(true);
      setError(null);

      try {
        const results = await Promise.all([
          getJSON(
            API_ENDPOINTS.metrics(timeframe),
            signal
          ),
          getJSON(API_ENDPOINTS.health, signal),
          getJSON(
            SUPPORTOPS_API.tickets("", {
              status: "open",
              limit: 10,
            }),
            signal
          ),
          getJSON(
            SUPPORTOPS_API.tickets("/channels"),
            signal
          ),
        ]);

        if (signal?.aborted) {
          return;
        }

        const [metricsData, healthData, ticketData, channelData] =
          results;

        setMetrics(metricsData);
        setHealth(healthData);

        const list = ticketData
          ? toList(ticketData)
          : [];

        // Fake data is opt-in only.
        const demoEnabled =
          import.meta.env.DEV &&
          import.meta.env.VITE_SUPPORTOPS_DEMO === "true";

        setDemo(demoEnabled && !list.length);

        const visibleTickets =
          demoEnabled && !list.length
            ? SAMPLE
            : list;

        setTickets(
          [...visibleTickets].sort(
            (a, b) =>
              (slaMins(a) ?? Number.MAX_SAFE_INTEGER) -
              (slaMins(b) ?? Number.MAX_SAFE_INTEGER)
          )
        );

        const rawChannels = channelData
          ? channelData.channels ?? channelData
          : [];

        setChannels(
          Array.isArray(rawChannels)
            ? Object.fromEntries(
              rawChannels.map((channel) => [
                channel.key,
                channel,
              ])
            )
            : rawChannels ?? {}
        );

        if (!metricsData && !healthData && !ticketData) {
          setError(
            "Dashboard data is currently unavailable. Check your session and backend connection, then try again."
          );
        }
      } catch (loadError) {
        if (!isAbortError(loadError)) {
          setError(
            "Unable to load workspace data. Please try again."
          );

          console.error(
            "[Dashboard] Failed to load workspace:",
            loadError
          );
        }
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [
      authorized,
      hasViewPermission,
      timeframe,
    ]
  );

  useEffect(() => {
    if (authLoading) {
      return undefined;
    }

    if (!authorized || !hasViewPermission) {
      setLoading(false);
      setRefreshing(false);
      return undefined;
    }

    const controller = new AbortController();

    load(controller.signal);

    return () => {
      controller.abort();
    };
  }, [
    authLoading,
    authorized,
    hasViewPermission,
    load,
  ]);

  // Show the login prompt without starting API requests.
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#030712] text-slate-300">
        <RefreshCw className="h-6 w-6 animate-spin mr-3 text-cyan-400" />
        Checking your session…
      </div>
    );
  }

  if (!authorized) {
    return <AccessRequired />;
  }

  if (!hasViewPermission) {
    const destination =
      role === "admin"
        ? "/supportops/admin/executive"
        : role === "management"
          ? "/supportops/agent/dashboard"
          : role === "investor"
            ? "/supportops/investor"
            : "/supportops/agent/dashboard";

    return <Navigate to={destination} replace />;
  }

  const atRisk = tickets.filter(
    (ticket) => (slaMins(ticket) ?? Infinity) <= 60
  );

  const connected = Object.keys(CHANNELS).filter(
    (key) => channels[key]?.connected
  ).length;

  const mrrGrowth = metrics?.mrrChange;

  const nextAction = {
    agent: atRisk.length
      ? `${atRisk.length} ticket${atRisk.length > 1 ? "s" : ""} will breach SLA within the hour. Start with ${atRisk[0].id}.`
      : "Review your open tickets and prioritize the oldest unresolved request.",

    management: atRisk.length
      ? `${atRisk.length} open ticket${atRisk.length > 1 ? "s are" : " is"} at SLA risk. Consider rebalancing the queue.`
      : "Review SLA health and workload distribution across channels.",

    admin:
      connected < 3
        ? `Only ${connected} of ${Object.keys(CHANNELS).length} channels are connected. Review your workspace integrations.`
        : "Review workspace health, seat usage, and integrations.",

    investor: mrrGrowth
      ? `MRR is ${mrrGrowth} for this period.`
      : "Business metrics will appear when revenue data is available.",
  }[current];

  const kpis = {
    agent: [
      [
        "Open tickets",
        tickets.length,
        "Tickets returned by the API",
        Ticket,
      ],
      [
        "SLA at risk",
        atRisk.length,
        "Due within 60 min",
        AlertTriangle,
      ],
      [
        "Avg first response",
        val(metrics?.avgFirstResponseMin, (value) => `${value} min`),
        "This period",
        Clock,
      ],
      [
        "Customer satisfaction",
        val(metrics?.csat, (value) => `${value}%`),
        "CSAT",
        Sparkles,
      ],
    ],

    management: [
      [
        "Backlog",
        val(metrics?.backlog ?? tickets.length),
        "Open across channels",
        Inbox,
      ],
      [
        "SLA compliance",
        val(metrics?.slaCompliance, (value) => `${value}%`),
        "Resolved on time",
        CheckCircle2,
      ],
      [
        "Avg resolution",
        val(metrics?.avgResolutionHours, (value) => `${value} h`),
        "This period",
        Clock,
      ],
      [
        "AI resolution rate",
        val(metrics?.aiResolutionRate, (value) => `${value}%`),
        "Handled without an agent",
        Sparkles,
      ],
    ],

    admin: [
      [
        "Channels connected",
        `${connected}/${Object.keys(CHANNELS).length}`,
        "Configured channels",
        Plug,
      ],
      [
        "Seats used",
        val(metrics?.seatsUsed, (value) =>
          `${value}${metrics?.seatLimit ? `/${metrics.seatLimit}` : ""}`
        ),
        "This workspace",
        Users,
      ],
      [
        "Tickets processed",
        val(metrics?.tickets, (value) =>
          value.toLocaleString()
        ),
        timeframe,
        Ticket,
      ],
      [
        "API latency",
        val(health?.apiLatencyMs, (value) => `${value} ms`),
        health?.uptime ?? "System health",
        Activity,
      ],
    ],

    investor: [
      [
        "Monthly recurring revenue",
        val(metrics?.mrr, (value) =>
          `$${value.toLocaleString()}`
        ),
        metrics?.mrrChange,
        DollarSign,
      ],
      [
        "Active customers",
        val(metrics?.customers, (value) =>
          value.toLocaleString()
        ),
        metrics?.customersChange,
        Users,
      ],
      [
        "Tickets handled",
        val(metrics?.tickets, (value) =>
          value.toLocaleString()
        ),
        metrics?.ticketsChange,
        Ticket,
      ],
      [
        "AI resolution rate",
        val(metrics?.aiResolutionRate, (value) => `${value}%`),
        "Cost saved by automation",
        Sparkles,
      ],
    ],
  }[current];

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}

      <div className="mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="text-xs text-slate-500 mb-1">
            Welcome back
            {user?.name ? `, ${user.name}` : ""}
          </p>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {TITLES[current][0]}
          </h1>

          <p className="text-sm text-slate-400">
            {TITLES[current][1]}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canPreview && (
            <div className="flex flex-wrap rounded-xl border border-slate-800 bg-slate-900 p-1">
              {Object.entries(VIEWS).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setPreview(key)}
                  className={`px-3 py-1.5 text-xs rounded-lg transition ${current === key
                    ? "bg-blue-600 text-white"
                    : "text-slate-400 hover:text-white"
                    }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          <select
            value={timeframe}
            onChange={(event) =>
              setTimeframe(event.target.value)
            }
            className="px-3 py-2 text-xs bg-slate-900 border border-slate-800 rounded-xl text-slate-300 focus:outline-none"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>

          <button
            type="button"
            onClick={() => {
              const controller = new AbortController();
              load(controller.signal);
            }}
            disabled={refreshing}
            aria-label="Refresh dashboard"
            className="p-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-300 hover:text-white disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""
                }`}
            />
          </button>
        </div>
      </div>

      <PlanBanner />

      {/* Status banners */}

      {nextAction && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-4 py-3 text-sm text-cyan-100">
          <Zap className="h-4 w-4 mt-0.5 shrink-0 text-cyan-400" />
          <span>{nextAction}</span>
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {demo && (
        <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
          Demo mode is enabled. The displayed sample tickets are not live customer data.
        </div>
      )}

      {/* Dashboard body */}

      {loading ? (
        <div className="flex items-center justify-center py-24 text-slate-400">
          <RefreshCw className="h-6 w-6 animate-spin mr-3 text-cyan-400" />
          Loading your workspace…
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
            {kpis.map(([label, value, hint, icon]) => (
              <Kpi
                key={label}
                label={label}
                value={value}
                hint={hint}
                icon={icon}
              />
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 space-y-6">
              {current === "agent" && (
                <Card
                  title="Priority queue"
                  icon={Inbox}
                  action={
                    <Link
                      to={
                        ROUTES?.agent?.tickets ||
                        "/supportops/agent/tickets"
                      }
                      className="text-xs text-cyan-400 hover:underline"
                    >
                      Open tickets
                    </Link>
                  }
                >
                  <TicketList tickets={tickets} />
                </Card>
              )}

              {current === "management" && (
                <>
                  <Card
                    title="Tickets at SLA risk"
                    icon={AlertTriangle}
                  >
                    <TicketList tickets={atRisk} />
                  </Card>

                  <Card title="Channel mix" icon={Inbox}>
                    <ChannelMix
                      tickets={tickets}
                      byChannel={metrics?.byChannel}
                    />
                  </Card>
                </>
              )}

              {current === "admin" && (
                <Card title="Channels" icon={Plug}>
                  <ChannelConnections channels={channels} />
                </Card>
              )}

              {current === "investor" && (
                <div className="rounded-2xl bg-slate-900/40 border border-slate-800/80 p-1">
                  <RevenueChart timeframe={timeframe} />
                </div>
              )}
            </div>

            <div className="space-y-6">
              {["management", "investor"].includes(current) && (
                <div className="rounded-2xl bg-slate-900/40 border border-slate-800/80 p-1">
                  <AIImpact timeframe={timeframe} />
                </div>
              )}

              <Card
                title="Live activity"
                icon={Activity}
                action={
                  <span
                    className={`text-[11px] ${isConnected
                      ? "text-emerald-400"
                      : "text-slate-500"
                      }`}
                  >
                    {isConnected ? "Live" : "Offline"}
                  </span>
                }
              >
                <LiveActivity events={events} />
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}