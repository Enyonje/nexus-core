// supportops/src/components/Access.jsx  Plan-aware building blocks for SupportOps.
import React from "react";
import { Link, Navigate, Outlet, useLocation } from "react-router-dom";
import { AlertTriangle, Lock, RefreshCw, Sparkles } from "lucide-react";
import { useApp } from "../../../context/AccessProvider";
import { useAuth } from "../context/AuthContext";
import { ROUTES } from "../config/paths";

// Remember where a visitor was heading, so after login/signup (handled by the main app)
// they land back here instead of on the main app's dashboard. AccessProvider reads this.
export const rememberReturn = (path) => sessionStorage.setItem("postAuthRedirect", path);

// Pages that need an account. Signed-out visitors go to login and come back afterwards.
export function RequireSignIn() {
    const { user, loading } = useAuth();
    const location = useLocation();
    if (loading) {
        return <div className="flex h-screen items-center justify-center bg-slate-900 text-slate-300"><RefreshCw className="h-6 w-6 animate-spin mr-3 text-cyan-400" />Loading…</div>;
    }
    if (!user) {
        rememberReturn(location.pathname + location.search);
        return <Navigate to={ROUTES.login} replace />;
    }
    return <Outlet />;
}

// Wrap every SupportOps page that needs a subscription. No subscription (or trial over) -> pricing.
export function RequireApp() {
    const a = useApp("supportops");
    if (a.loading) {
        return <div className="flex h-screen items-center justify-center bg-slate-900 text-slate-300"><RefreshCw className="h-6 w-6 animate-spin mr-3 text-cyan-400" />Loading your plan…</div>;
    }
    if (a.error) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-900 px-6">
                <div className="max-w-md rounded-2xl border border-red-500/30 bg-slate-900/80 p-6 text-center">
                    <AlertTriangle className="h-8 w-8 mx-auto mb-3 text-red-400" />
                    <p className="font-semibold text-white">We couldn't load your plan</p>
                    <p className="text-sm text-slate-400 mt-1">{a.error}</p>
                    <button type="button" onClick={() => a.refresh()} className="mt-4 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-sm font-semibold text-white">Try again</button>
                </div>
            </div>
        );
    }
    return a.subscribed ? <Outlet /> : <Navigate to={ROUTES.pricing} replace />;
}

// <RequireFeature feature="sla_predict" title="Predictive SLA engine">...</RequireFeature>
export function RequireFeature({ feature, title, children }) {
    const a = useApp("supportops");
    if (a.can(feature)) return children;
    return (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-8 text-center">
            <Lock className="h-8 w-8 mx-auto mb-3 text-slate-500" />
            <p className="font-semibold text-white">{title ?? "This feature"} isn't in your plan</p>
            <p className="text-sm text-slate-400 mt-1">Upgrade or add it to unlock it for your workspace.</p>
            <Link to={ROUTES.pricing} className="inline-block mt-4 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-sm font-semibold text-white">See plans</Link>
        </div>
    );
}

// Shows only when something needs attention: trial running, payment failed, or quota nearly used
export function PlanBanner() {
    const a = useApp("supportops");
    if (!a.subscribed) return null;

    const used = a.usage.ai_resolutions ?? 0;
    const limit = a.limits.ai_resolutions;
    const trial = a.status === "trialing";
    const days = trial && a.trialEndsAt ? Math.max(0, Math.ceil((new Date(a.trialEndsAt) - Date.now()) / 86400000)) : null;
    const nearLimit = typeof limit === "number" && limit > 0 && used / limit >= 0.8;

    let text = null;
    if (a.status === "past_due") text = "Your last payment failed. Update your payment details to keep access.";
    else if (trial) text = `Free trial: ${days} day${days === 1 ? "" : "s"} left · ${used}/${limit ?? "∞"} AI resolutions used.`;
    else if (nearLimit) text = `${used}/${limit} AI resolutions used this month. Extra resolutions are billed as overage.`;
    if (!text) return null;

    return (
        <div className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            <span className="flex items-center gap-2">{a.status === "past_due" ? <AlertTriangle className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}{text}</span>
            <Link to={ROUTES.pricing} className="shrink-0 font-semibold underline underline-offset-2 hover:text-white">{trial ? "Choose a plan" : "Manage plan"}</Link>
        </div>
    );
}