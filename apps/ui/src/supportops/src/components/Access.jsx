
// supportops/src/components/Access.jsx

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

import { useApp } from "../context/AccessProvider";
import { useAuth } from "../context/AuthContext";

/**
 * ============================================================
 * SUPPORTOPS ACCESS CONTROL
 * ============================================================
 *
 * PUBLIC ROUTES:
 * - Landing
 * - Features
 * - Pricing
 * - Admin Login
 * - Admin Registration
 * - Authentication Callback
 *
 * PROTECTED ROUTES:
 * - Admin Workspace
 * - Agent Workspace
 * - Investor Workspace
 *
 * AUTHENTICATION:
 * Required only when entering protected routes.
 *
 * WORKSPACE PERMISSIONS:
 *
 * ADMIN:
 * - Admin Workspace
 * - Agent Workspace
 * - Investor Workspace
 *
 * MANAGEMENT:
 * - Admin Workspace
 *
 * AGENT:
 * - Agent Workspace
 *
 * USER:
 * - Agent Workspace
 *
 * INVESTOR:
 * - Investor Workspace
 *
 * IMPORTANT:
 * Backend APIs must enforce these permissions independently.
 */

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

/**
 * Normalize authenticated user role.
 */
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

/**
 * Safely validates internal redirect destinations.
 *
 * Prevents:
 * - External redirects
 * - Protocol-relative URLs
 * - Backslash-based URL manipulation
 * - Malformed URLs
 */
export function safeNext(value, fallback = ADMIN_HOME) {
    if (
        typeof value !== "string" ||
        !value.trim()
    ) {
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

        return (
            parsed.pathname +
            parsed.search +
            parsed.hash
        );
    } catch {
        return fallback;
    }
}

// ============================================================
// WORKSPACE PERMISSIONS
// ============================================================

/**
 * Central SupportOps workspace permission map.
 *
 * ADMIN:
 * Full control across all workspaces.
 *
 * MANAGEMENT:
 * Administrative workspace only.
 *
 * AGENT:
 * Agent workspace only.
 *
 * INVESTOR:
 * Investor workspace only.
 */
const WORKSPACE_PERMISSIONS = {
    admin: [
        "admin",
        "agent",
        "investor",
    ],

    management: [
        "admin",
    ],

    agent: [
        "agent",
    ],

    user: [
        "agent",
    ],

    investor: [
        "investor",
    ],
};

/**
 * Check whether a user can access a workspace.
 */
export function canAccessWorkspace(user, workspace) {
    const role = normalizeRole(user);

    return (
        WORKSPACE_PERMISSIONS[role]?.includes(workspace) ??
        false
    );
}

// ============================================================
// DEFAULT WORKSPACE
// ============================================================

/**
 * Determine the default workspace after authentication.
 *
 * Administrators always land in the Executive Dashboard.
 */
export function getDefaultWorkspace(user) {
    const role = normalizeRole(user);

    switch (role) {
        case "admin":
        case "management":
            return ADMIN_HOME;

        case "agent":
        case "user":
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

/**
 * Determine the correct destination after login.
 *
 * Preserves valid requested destinations only when
 * the authenticated user has permission to access them.
 */
export function getPostLoginDestination(
    user,
    requestedPath
) {
    const role = normalizeRole(user);

    const defaultDestination =
        getDefaultWorkspace(user);

    if (
        !WORKSPACE_PERMISSIONS[role]
    ) {
        return SUPPORTOPS_LOGIN;
    }

    const requested = safeNext(
        requestedPath,
        defaultDestination
    );

    const workspaceRoutes = [
        {
            prefix: "/supportops/admin",
            workspace: "admin",
        },
        {
            prefix: "/supportops/agent",
            workspace: "agent",
        },
        {
            prefix: "/supportops/investor",
            workspace: "investor",
        },
    ];

    const matchedWorkspace = workspaceRoutes.find(
        ({ prefix }) =>
            requested === prefix ||
            requested.startsWith(`${prefix}/`)
    );

    if (
        matchedWorkspace &&
        !canAccessWorkspace(
            user,
            matchedWorkspace.workspace
        )
    ) {
        return defaultDestination;
    }

    return requested;
}

// ============================================================
// REMEMBER RETURN DESTINATION
// ============================================================

/**
 * Save the requested protected destination.
 *
 * Used after successful authentication.
 */
export const rememberReturn = (path) => {
    if (typeof window === "undefined") {
        return;
    }

    const safePath = safeNext(path, "");

    if (!safePath) {
        return;
    }

    window.sessionStorage.setItem(
        "postAuthRedirect",
        safePath
    );
};

/**
 * Retrieve and clear the saved destination.
 */
export function consumeReturn() {
    if (typeof window === "undefined") {
        return "";
    }

    const stored = window.sessionStorage.getItem(
        "postAuthRedirect"
    );

    window.sessionStorage.removeItem(
        "postAuthRedirect"
    );

    return safeNext(stored, "");
}

// ============================================================
// REQUIRE SIGN IN
// ============================================================

/**
 * Protect authenticated application routes.
 *
 * Public pages must NOT use this guard.
 *
 * Unauthenticated visitors are redirected to Admin Login.
 */
export function RequireSignIn() {
    const { user, loading } = useAuth();

    const location = useLocation();

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-900 text-slate-300">

                <RefreshCw className="mr-3 h-6 w-6 animate-spin text-cyan-400" />

                <span>
                    Checking your session...
                </span>

            </div>
        );
    }

    if (!user || user.isGuest) {
        const requestedPath =
            location.pathname +
            location.search +
            location.hash;

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

/**
 * Require an active SupportOps subscription or trial.
 *
 * Authentication must already have succeeded.
 */
export function RequireApp() {
    const app = useApp();

    const auth = useAuth();

    const location = useLocation();

    if (app.loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-900 text-slate-300">

                <RefreshCw className="mr-3 h-6 w-6 animate-spin text-cyan-400" />

                <span>
                    Loading your workspace plan...
                </span>

            </div>
        );
    }

    if (app.error) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-900 px-6">

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
                            if (
                                typeof app.refetch === "function"
                            ) {
                                app.refetch();
                            } else if (
                                typeof auth.refetchAuth === "function"
                            ) {
                                auth.refetchAuth();
                            } else {
                                window.location.reload();
                            }
                        }}
                        className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
                    >
                        Try again
                    </button>

                </div>

            </div>
        );
    }

    const isSubscribed =
        app.isSubscribed ??
        app.subscribed ??
        false;

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

/**
 * Protect individual subscription features.
 *
 * Backend must enforce identical feature permissions.
 */
export function RequireFeature({
    feature,
    title,
    children,
}) {
    const app = useApp();

    const hasAccess = app.can
        ? app.can(feature)
        : Boolean(
            app.hasPermission?.(feature) ||
            app.canAccess?.({
                permission: feature,
            })
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
                Upgrade your plan or add this feature to unlock it
                for your workspace.
            </p>

            <Link
                to={SUPPORTOPS_PRICING}
                className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
            >
                See plans
            </Link>

        </div>
    );
}

// ============================================================
// SUBSCRIPTION PLAN BANNER
// ============================================================

/**
 * Display subscription usage and billing notices.
 */
export function PlanBanner() {
    const app = useApp();

    const { subscription } = useAuth();

    const isSubscribed =
        app.isSubscribed ??
        app.subscribed ??
        false;

    if (!isSubscribed) {
        return null;
    }

    const usage =
        subscription?.usage ||
        app.usage ||
        {};

    const limits =
        subscription?.limits ||
        app.limits ||
        {};

    const status =
        subscription?.status ||
        app.subscriptionStatus ||
        app.status;

    const trialEndsAt =
        subscription?.trialEndsAt ||
        app.trialEndsAt;

    const used =
        usage.ai_resolutions ?? 0;

    const limit =
        limits.ai_resolutions;

    const isTrial =
        status === "trialing";

    const daysRemaining =
        isTrial && trialEndsAt
            ? Math.max(
                0,
                Math.ceil(
                    (
                        new Date(trialEndsAt).getTime() -
                        Date.now()
                    ) / 86400000
                )
            )
            : null;

    const nearLimit =
        typeof limit === "number" &&
        limit > 0 &&
        used / limit >= 0.8;

    let message = null;

    if (status === "past_due") {
        message =
            "Your last payment failed. Update your payment details to keep access.";

    } else if (isTrial) {
        message =
            `Free trial: ${daysRemaining ?? 0} day${daysRemaining === 1 ? "" : "s"} left · ${used}/${limit ?? "∞"} AI resolutions used.`;

    } else if (nearLimit) {
        message =
            `${used}/${limit} AI resolutions used this month. Extra resolutions may be billed as overage.`;
    }

    if (!message) {
        return null;
    }

    return (
        <div className="mb-6 flex flex-col gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100 sm:flex-row sm:items-center sm:justify-between">

            <span className="flex items-center gap-2">

                {status === "past_due" ? (
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                ) : (
                    <Sparkles className="h-4 w-4 shrink-0" />
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