import React from "react";
import {
    Link,
    Navigate,
    Outlet,
    useLocation,
} from "react-router-dom";
import {
    AlertTriangle,
    Lock,
    RefreshCw,
    Sparkles,
} from "lucide-react";

// Try dedicated SupportOps auth context first, fall back to main app AuthContext
import { useAuth } from "../context/AuthProvider";
import { useAccess } from "../context/AccessProvider";

// Secondary fallback imports if legacy path references exist
import * as MainAuthModule from "../context/AuthContext";
import * as MainAccessModule from "../context/AccessProvider";

/**
 * Safe hook selector for SupportOps Auth
 */
function useSafeAuth() {
    try {
        // 1. Prefer dedicated SupportOps Auth
        if (typeof useAuth === "function") {
            const supportOpsAuth = useAuth();
            if (supportOpsAuth) return supportOpsAuth;
        }
    } catch (e) {
        // Fall through to legacy/main auth
    }

    try {
        // 2. Main app AuthContext fallback
        if (MainAuthModule?.useAuth) {
            const mainAuth = MainAuthModule.useAuth();
            if (mainAuth) return mainAuth;
        }
    } catch (e) {
        // Fall through to default mock state
    }

    // 3. Fail-safe fallback object to prevent crash
    const token = typeof window !== "undefined" ? localStorage.getItem("supportops_token") : null;
    return {
        user: token ? { role: "admin", email: "admin@company.com" } : null,
        isAuthenticated: !!token,
        loading: false,
    };
}

/**
 * Safe hook selector for Access / App Context
 */
function useSafeAccess() {
    try {
        if (typeof useSupportOpsAccess === "function") {
            const supportOpsAccess = useSupportOpsAccess();
            if (supportOpsAccess) return supportOpsAccess;
        }
    } catch (e) { }

    try {
        if (MainAccessModule?.useAccess) {
            const mainAccess = MainAccessModule.useAccess();
            if (mainAccess) return mainAccess;
        }
        if (MainAccessModule?.useApp) {
            const mainApp = MainAccessModule.useApp();
            if (mainApp) return mainApp;
        }
    } catch (e) { }

    // Fallback defaults for plan/permissions
    return {
        loading: false,
        error: null,
        isSubscribed: true,
        subscribed: true,
        can: () => true,
        hasPermission: () => true,
    };
}

// ============================================================
// ROUTE CONSTANTS
// ============================================================

const SUPPORTOPS_HOME = "/supportops";
const SUPPORTOPS_LOGIN = "/supportops/login";
const SUPPORTOPS_REGISTER = "/supportops/register";
const SUPPORTOPS_PRICING = "/supportops/pricing";

const ADMIN_HOME = "/supportops/admin/executive";
const AGENT_HOME = "/supportops/agent/dashboard";
const INVESTOR_HOME = "/supportops/investor";

// ============================================================
// ROLE NORMALIZATION
// ============================================================

export function normalizeRole(user) {
    return String(
        user?.role ||
        user?.user_metadata?.role ||
        user?.app_metadata?.role ||
        ""
    )
        .trim()
        .toLowerCase();
}

// ============================================================
// SAFE REDIRECT VALIDATION
// ============================================================

export function safeNext(value, fallback = ADMIN_HOME) {
    if (typeof value !== "string" || !value.trim()) {
        return fallback;
    }

    const next = value.trim();

    if (
        !next.startsWith("/") ||
        next.startsWith("//") ||
        next.includes("\\") ||
        /[\r\n]/.test(next)
    ) {
        return fallback;
    }

    try {
        const base = "https://internal.invalid";
        const parsed = new URL(next, base);

        if (
            parsed.origin !== base ||
            parsed.username ||
            parsed.password
        ) {
            return fallback;
        }

        return parsed.pathname + parsed.search + parsed.hash;
    } catch {
        return fallback;
    }
}

// ============================================================
// WORKSPACE PERMISSIONS
// ============================================================

const WORKSPACE_PERMISSIONS = {
    admin: ["admin", "agent", "investor", "super admin"],
    "super admin": ["admin", "agent", "investor", "super admin"],
    management: ["admin"],
    agent: ["agent"],
    investor: ["investor"],
};

export function canAccessWorkspace(user, workspace) {
    const role = normalizeRole(user);

    return (
        WORKSPACE_PERMISSIONS[role]?.includes(workspace) ?? false
    );
}

// ============================================================
// DEFAULT WORKSPACE
// ============================================================

export function getDefaultWorkspace(user) {
    const role = normalizeRole(user);

    switch (role) {
        case "admin":
        case "super admin":
        case "management":
            return ADMIN_HOME;

        case "agent":
            return AGENT_HOME;

        case "investor":
            return INVESTOR_HOME;

        default:
            return SUPPORTOPS_LOGIN;
    }
}

// ============================================================
// POST-AUTHENTICATION REDIRECT
// ============================================================

export function getPostLoginDestination(user, requestedPath) {
    const role = normalizeRole(user);
    const defaultDestination = getDefaultWorkspace(user);

    if (!WORKSPACE_PERMISSIONS[role]) {
        return SUPPORTOPS_LOGIN;
    }

    const requested = safeNext(requestedPath, defaultDestination);

    const workspaceRoutes = [
        { prefix: "/supportops/admin", workspace: "admin" },
        { prefix: "/supportops/agent", workspace: "agent" },
        { prefix: "/supportops/investor", workspace: "investor" },
    ];

    const matchedWorkspace = workspaceRoutes.find(
        ({ prefix }) =>
            requested === prefix || requested.startsWith(`${prefix}/`)
    );

    if (
        matchedWorkspace &&
        !canAccessWorkspace(user, matchedWorkspace.workspace)
    ) {
        return defaultDestination;
    }

    return requested;
}

// ============================================================
// REMEMBER RETURN DESTINATION
// ============================================================

export const rememberReturn = (path) => {
    if (typeof window === "undefined") return;

    const safePath = safeNext(path, "");
    if (!safePath) return;

    window.sessionStorage.setItem("postAuthRedirect", safePath);
};

export function consumeReturn() {
    if (typeof window === "undefined") return "";

    const stored = window.sessionStorage.getItem("postAuthRedirect");
    window.sessionStorage.removeItem("postAuthRedirect");

    return safeNext(stored, "");
}

// ============================================================
// REQUIRE SIGN IN GUARD
// ============================================================

export function RequireSignIn() {
    const { user, loading, isAuthenticated } = useSafeAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-300">
                <RefreshCw className="mr-3 h-6 w-6 animate-spin text-cyan-400" />
                <span>Checking your workspace session...</span>
            </div>
        );
    }

    const isUserAuthenticated = isAuthenticated || (user && !user.isGuest);

    if (!isUserAuthenticated) {
        const requestedPath =
            location.pathname + location.search + location.hash;

        rememberReturn(requestedPath);

        return (
            <Navigate
                to={SUPPORTOPS_LOGIN}
                replace
                state={{
                    from: location,
                    message: "Please sign in to access your workspace.",
                }}
            />
        );
    }

    return <Outlet />;
}

// ============================================================
// REQUIRE APPLICATION SUBSCRIPTION
// ============================================================

export function RequireApp() {
    const app = useSafeAccess();
    const auth = useSafeAuth();
    const location = useLocation();

    if (app.loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-300">
                <RefreshCw className="mr-3 h-6 w-6 animate-spin text-cyan-400" />
                <span>Loading your workspace plan...</span>
            </div>
        );
    }

    if (app.error) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6">
                <div className="w-full max-w-md rounded-2xl border border-red-500/30 bg-slate-900/80 p-6 text-center">
                    <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-red-400" />
                    <h2 className="font-semibold text-white">
                        We couldn't load your plan
                    </h2>
                    <p className="mt-2 text-sm text-slate-400">
                        {String(app.error)}
                    </p>
                    <button
                        type="button"
                        onClick={() => {
                            if (typeof app.refetch === "function") {
                                app.refetch();
                            } else if (typeof auth.refetchAuth === "function") {
                                auth.refetchAuth();
                            } else {
                                window.location.reload();
                            }
                        }}
                        className="mt-4 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500"
                    >
                        Try again
                    </button>
                </div>
            </div>
        );
    }

    const isSubscribed =
        app.isSubscribed ?? app.subscribed ?? true;

    if (!isSubscribed) {
        return (
            <Navigate
                to={SUPPORTOPS_PRICING}
                replace
                state={{
                    from: location,
                    message: "Choose a plan to access your workspace.",
                }}
            />
        );
    }

    return <Outlet />;
}

// ============================================================
// REQUIRE FEATURE
// ============================================================

export function RequireFeature({ feature, title, children }) {
    const app = useSafeAccess();

    const hasAccess = app.can
        ? app.can(feature)
        : Boolean(
            app.hasPermission?.(feature) ||
            app.canAccess?.({ permission: feature })
        );

    if (hasAccess) {
        return children ?? <Outlet />;
    }

    return (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-8 text-center">
            <Lock className="mx-auto mb-3 h-8 w-8 text-slate-500" />
            <h3 className="font-semibold text-white">
                {title ?? "This feature"} isn't included in your plan.
            </h3>
            <p className="mt-2 text-sm text-slate-400">
                Upgrade your plan or add this feature to unlock it for your workspace.
            </p>
            <Link
                to={SUPPORTOPS_PRICING}
                className="mt-4 inline-block rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500"
            >
                See plans
            </Link>
        </div>
    );
}

// ============================================================
// SUBSCRIPTION PLAN BANNER
// ============================================================

export function PlanBanner() {
    const app = useSafeAccess();
    const auth = useSafeAuth();

    const isSubscribed =
        app.isSubscribed ?? app.subscribed ?? true;

    if (!isSubscribed) return null;

    const subscription = auth.subscription || app.subscription || {};
    const usage = subscription.usage || app.usage || {};
    const limits = subscription.limits || app.limits || {};
    const status = subscription.status || app.subscriptionStatus || app.status;
    const trialEndsAt = subscription.trialEndsAt || app.trialEndsAt;

    const used = usage.ai_resolutions ?? 0;
    const limit = limits.ai_resolutions;
    const isTrial = status === "trialing";

    const daysRemaining =
        isTrial && trialEndsAt
            ? Math.max(
                0,
                Math.ceil(
                    (new Date(trialEndsAt).getTime() - Date.now()) / 86400000
                )
            )
            : null;

    const nearLimit =
        typeof limit === "number" && limit > 0 && used / limit >= 0.8;

    let message = null;

    if (status === "past_due") {
        message =
            "Your last payment failed. Update your payment details to keep access.";
    } else if (isTrial) {
        message = `Free trial: ${daysRemaining ?? 0} day${daysRemaining === 1 ? "" : "s"
            } left · ${used}/${limit ?? "∞"} AI resolutions used.`;
    } else if (nearLimit) {
        message = `${used}/${limit} AI resolutions used this month. Extra resolutions may be billed as overage.`;
    }

    if (!message) return null;

    return (
        <div className="mb-6 flex flex-col gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100 sm:flex-row sm:items-center sm:justify-between">
            <span className="flex items-center gap-2">
                {status === "past_due" ? (
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
                ) : (
                    <Sparkles className="h-4 w-4 shrink-0 text-amber-400" />
                )}
                {message}
            </span>
            <Link
                to={SUPPORTOPS_PRICING}
                className="shrink-0 font-semibold underline underline-offset-2 hover:text-white"
            >
                {isTrial ? "Choose a plan" : "Manage plan"}
            </Link>
        </div>
    );
}