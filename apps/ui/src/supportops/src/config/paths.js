export const BASE = "/supportops";

// Frontend route helper (React Router links, navigate, redirects)
export const p = (path = "") => `${BASE}${path.startsWith("/") ? path : `/${path}`}`;

/* =========================
   BACKEND API
========================= */

// Prefer a SupportOps-specific URL, fall back to the shared one. Trailing slash stripped.
const envUrl = import.meta.env.VITE_SUPPORTOPS_API_URL || import.meta.env.VITE_API_URL;

// In production a missing URL must be loud, never a silent fallback to localhost
if (!envUrl && import.meta.env.PROD) {
    console.error("VITE_API_URL is not set for this build. API calls will fail.");
}

const API_BASE_URL = (envUrl || "http://localhost:8000").replace(/\/$/, "");

// Backend URL helper: api("/api/v1/x") -> "http://host/api/v1/x"
export const api = (path = "") => `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;

// Build a query string, skipping empty values: qs({ a: 1, b: "" }) -> "?a=1"
const qs = (params = {}) => {
    const q = new URLSearchParams(
        Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")
    ).toString();
    return q ? `?${q}` : "";
};

// Mirrors the prefixes registered in the Fastify server
const V1 = "/api/v1";
const SUPPORTOPS = `${V1}/supportops`;
const AUTH_PREFIX = import.meta.env.VITE_AUTH_PREFIX || `${V1}/auth`; // where authRoutes is registered

// Joins a router prefix with a sub-path: group("/ai")("/x") -> api("/api/v1/supportops/ai/x")
const group = (prefix) => {
    const root = `${SUPPORTOPS}${prefix}`;
    const fn = (path = "", params) =>
        api(`${root}${path ? (path.startsWith("/") ? path : `/${path}`) : ""}${qs(params)}`);
    fn.root = api(root);
    return fn;
};

// One builder per registered router
export const SUPPORTOPS_API = {
    ai: group("/ai"),                 // prefix: /api/v1/supportops/ai
    aiReview: group("/ai-review"),    // prefix: /api/v1/supportops/ai-review
    incidents: group("/incidents"),   // prefix: /api/v1/supportops/incidents
    analytics: group("/analytics"),   // prefix: /api/v1/supportops/analytics
    tickets: group("/tickets"),       // prefix: /api/v1/supportops/tickets
    users: group("/users"),
    chat: group("/chat"),           // prefix: /api/v1/supportops/chat           // prefix: /api/v1/supportops/users
    // webhooks/stripe is server-to-server only (Stripe calls it), so the frontend never uses it
};

// Named backend API endpoints
export const API_ENDPOINTS = {
    // Fastify: app.get("/api/v1/dashboard/metrics")
    metrics: (timeframe = "30d") => api(`${V1}/dashboard/metrics${qs({ timeframe })}`),
    health: api(`${V1}/system/health`),
    activityStream: api(`${V1}/agents/activity/stream`),

    // SupportOps routers. The ".root" is certain; sub-paths must match your route files.
    ai: SUPPORTOPS_API.ai,
    aiReview: SUPPORTOPS_API.aiReview,
    incidents: SUPPORTOPS_API.incidents,
    analytics: SUPPORTOPS_API.analytics,
    tickets: SUPPORTOPS_API.tickets,
    users: SUPPORTOPS_API.users,

    // Your existing authRoutes plugin. Set AUTH_PREFIX to wherever it is registered.
    auth: {
        register: api(`${AUTH_PREFIX}/supportops/register`), // new SupportOps route (see backend patch)
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
    login: "/login",      // main app (central login)
    signup: "/register",  // main app (central signup)
    cancel: p("/cancel"),
    success: p("/success"),

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
    },

    investor: p("/investor"),
};

// Role landing redirect helper
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