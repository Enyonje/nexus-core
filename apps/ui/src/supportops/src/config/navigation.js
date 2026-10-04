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
import { ROUTES } from "./paths";

// Must mirror the allowRoles on each ProtectedRoute in SupportOpsRoutes
export const AGENT_ROLES = ["agent", "user", "admin"];
export const ADMIN_ROLES = ["admin", "management"];
export const INVESTOR_ROLES = ["investor", "admin"];

// group = which top-navbar set a role sees; roles = who may open the page (sidebar)
export const NAV_ITEMS = [
    // Agent
    { to: ROUTES.agent.dashboard, label: "Dashboard", icon: BarChart3, group: "agent", roles: AGENT_ROLES, navbar: true },
    { to: ROUTES.agent.analytics, label: "Analytics", icon: LineChart, group: "agent", roles: AGENT_ROLES, navbar: true },
    { to: ROUTES.agent.brain, label: "Autonomous Brain", short: "Brain", icon: Brain, group: "agent", roles: AGENT_ROLES, navbar: true },
    { to: ROUTES.agent.inbox, label: "AI Review Inbox", icon: Bot, group: "agent", roles: AGENT_ROLES },
    { to: ROUTES.agent.tickets, label: "Tickets", icon: Inbox, group: "agent", roles: AGENT_ROLES, navbar: true },
    { to: ROUTES.agent.chats, label: "Live Chat", icon: MessagesSquare, group: "agent", roles: AGENT_ROLES, navbar: true },
    { to: ROUTES.agent.revenue, label: "Revenue Forecast", icon: TrendingUp, group: "agent", roles: AGENT_ROLES },
    { to: ROUTES.agent.billing, label: "Billing", icon: CreditCard, group: "agent", roles: AGENT_ROLES },
    { to: ROUTES.agent.playbooks, label: "Playbooks", icon: BookOpen, group: "agent", roles: AGENT_ROLES },

    // Admin
    { to: ROUTES.admin.executive, label: "Executive", icon: ShieldAlert, group: "admin", roles: ADMIN_ROLES, navbar: true },
    { to: ROUTES.admin.analytics, label: "Admin Analytics", short: "Analytics", icon: LineChart, group: "admin", roles: ADMIN_ROLES, navbar: true },
    { to: ROUTES.admin.incidents, label: "Incidents", icon: Siren, group: "admin", roles: ADMIN_ROLES, navbar: true },

    { to: ROUTES.admin.channels, label: "Channels", icon: Plug, group: "admin", roles: ["admin"], navbar: true },

    // Investor
    { to: ROUTES.investor, label: "Investor Mode", icon: Users, group: "investor", roles: INVESTOR_ROLES, navbar: true },
];

export function groupForRole(role) {
    if (role === "admin" || role === "management") return "admin";
    if (role === "investor") return "investor";
    return "agent";
}

export const canAccess = (item, role) => item.roles.includes(role);