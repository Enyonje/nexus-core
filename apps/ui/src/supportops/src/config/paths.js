export const BASE = "/supportops";

// p("/signup") -> "/supportops/signup"  (for links, navigate(), <Navigate>)
export const p = (path = "") => `${BASE}${path.startsWith("/") ? path : `/${path}`}`;

// Named absolute URLs, so nobody hand-types paths
export const ROUTES = {
  home: p("/"),
  features: p("/features"),
  login: p("/login"),
  signup: p("/signup"),
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
  },

  admin: {
    root: p("/admin"),
    executive: p("/admin/executive"),
    analytics: p("/admin/analytics"),
    incidents: p("/admin/incidents"),
  },

  investor: p("/investor"),
};

// Where each role lands after login/signup
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
