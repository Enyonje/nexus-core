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
 * Public SupportOps routes do not use these guards.
 *
 * RequireSignIn protects routes that need authentication.
 * RequireApp protects routes that require an active subscription.
 * RequireFeature protects individual subscription features.
 */

const SUPPORTOPS_LOGIN = "/supportops/login";
const SUPPORTOPS_PRICING = "/supportops/pricing";

/**
 * Save the destination to return to after successful authentication.
 */
export const rememberReturn = (path) => {
    if (
        typeof window === "undefined" ||
        typeof path !== "string" ||
        !path.startsWith("/") ||
        path.startsWith("//")
    ) {
        return;
    }

    window.sessionStorage.setItem("postAuthRedirect", path);
};

/**
 * Redirect unauthenticated visitors to login.
 */
export function RequireSignIn() {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-900 text-slate-300">
                <RefreshCw className="mr-3 h-6 w-6 animate-spin text-cyan-400" />
                <span>Checking your session...</span>
            </div>
        );
    }

    if (!user || user.isGuest) {
        const requestedPath =
            location.pathname + location.search;

        rememberReturn(requestedPath);

        return (
            <Navigate
                to={SUPPORTOPS_LOGIN}
                replace
                state={{
                    from: location,
                    message: "Please sign in to access this page.",
                }}
            />
        );
    }

    return <Outlet />;
}

/**
 * Require an active SupportOps subscription or trial.
 */
export function RequireApp() {
    const app = useApp();
    const auth = useAuth();
    const location = useLocation();

    if (app.loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-900 text-slate-300">
                <RefreshCw className="mr-3 h-6 w-6 animate-spin text-cyan-400" />
                <span>Loading your workspace plan...</span>
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
                            if (typeof app.refetch === "function") {
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
        app.isSubscribed ?? app.subscribed ?? false;

    if (!isSubscribed) {
        return (
            <Navigate
                to={SUPPORTOPS_PRICING}
                replace
                state={{
                    from: location,
                    message: "Choose a plan to access this workspace.",
                }}
            />
        );
    }

    return <Outlet />;
}

/**
 * Protect an individual subscription feature.
 *
 * The backend must enforce the same permissions.
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

/**
 * Display subscription usage and billing notices.
 */
export function PlanBanner() {
    const app = useApp();
    const { subscription } = useAuth();

    const isSubscribed =
        app.isSubscribed ?? app.subscribed ?? false;

    if (!isSubscribed) {
        return null;
    }

    const usage =
        subscription?.usage || app.usage || {};

    const limits =
        subscription?.limits || app.limits || {};

    const status =
        subscription?.status ||
        app.subscriptionStatus ||
        app.status;

    const trialEndsAt =
        subscription?.trialEndsAt ||
        app.trialEndsAt;

    const used = usage.ai_resolutions ?? 0;
    const limit = limits.ai_resolutions;

    const isTrial = status === "trialing";

    const daysRemaining =
        isTrial && trialEndsAt
            ? Math.max(
                0,
                Math.ceil(
                    (new Date(trialEndsAt).getTime() -
                        Date.now()) /
                    86400000
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
