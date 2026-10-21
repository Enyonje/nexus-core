export const BASE = "/supportops";

// Frontend route helper (React Router links, navigate, redirects)
export const p = (path = "") => `${BASE}${path.startsWith("/") ? path : `/${path}`}`;

/* =========================
   BACKEND API
========================= */

// Prefer a SupportOps-specific URL, fall back to the shared one. Trailing slash stripped.
const envUrl = import.meta.env.VITE_SUPPORTOPS_API_URL || import.meta.env.VITE_API_URL;

if (!envUrl && import.meta.env.PROD) {
    console.error("VITE_API_URL is not set for this build. API calls will fail.");
}

const API_BASE_URL = (envUrl || "http://localhost:8000").replace(/\/$/, "");

// Backend URL helper: api("/api/v1/x") -> "http://host/api/v1/x"
export const api = (path = "") => `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;

// Build a query string, skipping empty values
const qs = (params = {}) => {
    const q = new URLSearchParams(
        Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")
    ).toString();
    return q ? `?${q}` : "";
};

const V1 = "/api/v1";
const SUPPORTOPS = `${V1}/supportops`;
const AUTH_PREFIX = import.meta.env.VITE_AUTH_PREFIX || `${V1}/auth`;

const group = (prefix) => {
    const root = `${SUPPORTOPS}${prefix}`;
    const fn = (path = "", params) =>
        api(`${root}${path ? (path.startsWith("/") ? path : `/${path}`) : ""}${qs(params)}`);
    fn.root = api(root);
    return fn;
};

// Builder per registered router
export const SUPPORTOPS_API = {
    ai: group("/ai"),
    aiReview: group("/ai-review"),
    incidents: group("/incidents"),
    analytics: group("/analytics"),
    tickets: group("/tickets"),
    users: group("/users"),
    chat: group("/chat"),
    invites: group("/invites"),
    readiness: group("/readiness"),
};

// Named backend API endpoints
export const API_ENDPOINTS = {
    metrics: (timeframe = "30d") => api(`${V1}/dashboard/metrics${qs({ timeframe })}`),
    health: api(`${V1}/system/health`),
    activityStream: api(`${V1}/stream/agents/activity/stream`),

    ai: SUPPORTOPS_API.ai,
    aiReview: SUPPORTOPS_API.aiReview,
    incidents: SUPPORTOPS_API.incidents,
    analytics: SUPPORTOPS_API.analytics,
    tickets: SUPPORTOPS_API.tickets,
    users: SUPPORTOPS_API.users,
    invites: SUPPORTOPS_API.invites,

    billing: {
        plans: (app = "supportops") => api(`${V1}/billing/plans?app=${app}`),
        trial: api(`${V1}/billing/trial`),
        checkout: api(`${V1}/billing/checkout`),
    },

    auth: {
        register: api(`${AUTH_PREFIX}/register`),
        login: api(`${AUTH_PREFIX}/login`),
        me: api(`${AUTH_PREFIX}/me`),
        refresh: api(`${AUTH_PREFIX}/refresh`),
    },
};

/* =========================
   CLIENT ROUTES
========================= */

// Named absolute client routes
export const ROUTES = {
    home: p("/"),
    features: p("/features"),
    login: "/login",
    signup: "/register",
    cancel: p("/cancel"),
    success: p("/success"),
    pricing: p("/pricing"),
    join: p("/join"), // User invite acceptance route

    agent: {
        root: p("/agent"),
        dashboard: p("/agent/dashboard"),
        analytics: p("/agent/analytics"),
        revenue: p("/agent/revenue"),
        brain: p("/agent/brain"),
        inbox: p("/agent/inbox"),
        billing: p("/agent/billing"),
        playbooks: p("/agent/playbooks"),
        chats: p("/agent/chats"),
        tickets: p("/agent/tickets"),
    },

    admin: {
        root: p("/admin"),
        executive: p("/admin/executive"),
        analytics: p("/admin/analytics"),
        incidents: p("/admin/incidents"),
        channels: p("/admin/channels"),
        team: p("/admin/team"),        // Team invites & management
        account: p("/admin/account"),  // Admin account settings
    },

    investor: p("/investor"),
};

/**
 * Resolves default landing route based on authenticated role.
 * Admins/Management -> Admin Executive View
 * Agents/Users -> Agent Dashboard
 */
export function homeForRole(role) {
    switch (role) {
        case "admin":
        case "management":
            return ROUTES.admin.executive;
        case "investor":
            return ROUTES.investor;
        case "agent":
        case "user":
        default:
            return ROUTES.agent.dashboard;
    }
}