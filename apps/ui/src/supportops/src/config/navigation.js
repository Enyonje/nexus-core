import {
    BarChart3,
    LineChart,
    Brain,
    Bot,
    TrendingUp,
    CreditCard,
    BookOpen,
    ShieldAlert,
    Siren,
    Users,
    Plug,
    MessagesSquare,
    Inbox,
} from "lucide-react";
import { ROUTES } from "../config/paths";

/* ==========================================
 ROLE GROUP DEFINITIONS
========================================== */
export const AGENT_ROLES = ["agent"];
export const MANAGEMENT_ROLES = ["management", "admin"];
export const ADMIN_ROLES = ["admin", "management"];
export const STRICT_ADMIN_ROLES = ["admin"];
export const INVESTOR_ROLES = ["investor"];

/* ==========================================
 NAV ITEMS
========================================== */
export const NAV_ITEMS = [
    // ---------------- ADMIN & MANAGEMENT CONTROL CENTER ----------------
    { to: ROUTES.admin.dashboard, label: "Admin Dashboard", icon: BarChart3, group: "admin", roles: ADMIN_ROLES, navbar: true },
    { to: ROUTES.admin.executive, label: "Executive", icon: ShieldAlert, group: "admin", roles: ADMIN_ROLES, navbar: true },
    { to: ROUTES.admin.analytics, label: "Admin Analytics", short: "Analytics", icon: LineChart, group: "admin", roles: ADMIN_ROLES, navbar: true },
    { to: ROUTES.admin.incidents, label: "Incidents", icon: Siren, group: "admin", roles: ADMIN_ROLES, navbar: true },
    { to: ROUTES.admin.team, label: "Team", icon: Users, group: "admin", roles: STRICT_ADMIN_ROLES, navbar: true },
    { to: ROUTES.admin.channels, label: "Channels", icon: Plug, group: "admin", roles: STRICT_ADMIN_ROLES, navbar: true },

    // ---------------- AGENT WORKSPACE ----------------
    { to: ROUTES.agent.dashboard, label: "Agent Dashboard", icon: BarChart3, group: "agent", roles: AGENT_ROLES, navbar: true },
    { to: ROUTES.agent.analytics, label: "Analytics", icon: LineChart, group: "agent", roles: MANAGEMENT_ROLES, navbar: true },
    { to: ROUTES.agent.brain, label: "Autonomous Brain", short: "Brain", icon: Brain, group: "agent", roles: MANAGEMENT_ROLES, navbar: true },
    { to: ROUTES.agent.inbox, label: "AI Review Inbox", icon: Bot, group: "agent", roles: MANAGEMENT_ROLES },
    { to: ROUTES.agent.tickets, label: "Tickets", icon: Inbox, group: "agent", roles: MANAGEMENT_ROLES, navbar: true },
    { to: ROUTES.agent.chats, label: "Live Chat", icon: MessagesSquare, group: "agent", roles: MANAGEMENT_ROLES, navbar: true },
    { to: ROUTES.agent.revenue, label: "Revenue Forecast", icon: TrendingUp, group: "agent", roles: MANAGEMENT_ROLES },
    { to: ROUTES.agent.billing, label: "Billing", icon: CreditCard, group: "agent", roles: MANAGEMENT_ROLES },
    { to: ROUTES.agent.playbooks, label: "Playbooks", icon: BookOpen, group: "agent", roles: MANAGEMENT_ROLES },

    // ---------------- INVESTOR MODE ----------------
    { to: ROUTES.investor, label: "Investor Mode", icon: Users, group: "investor", roles: INVESTOR_ROLES, navbar: true },
];

/* ==========================================
 HELPERS
========================================== */
export function groupForRole(role) {
    const cleanRole = (role || "").toLowerCase();
    if (cleanRole === "admin" || cleanRole === "management") return "admin";
    if (cleanRole === "investor") return "investor";
    return "agent";
}

export const canAccess = (item, role) =>
    item.roles.includes((role || "").toLowerCase());
