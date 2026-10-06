// supportops/src/pages/PricingPage.jsx - Plans, add-ons, free trial and checkout.
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Check, RefreshCw } from "lucide-react";
import { API_ENDPOINTS, ROUTES, homeForRole } from "../config/paths";
import { useApp } from "../../../context/AccessProvider";
import { useAuth } from "../context/AuthContext";
import { rememberReturn } from "../components/Access";

const LABELS = {
    triage_basic: "Basic triage", channel_email: "Email", channel_web: "In-app chat", helpdesk_sync: "Intercom / Zendesk sync",
    sla_predict: "Predictive SLA engine", webhooks: "Custom webhook triggers", sso: "SSO", rbac: "Role-based access control",
    audit_logs: "Audit logs & exports", tenant_isolation: "Dedicated tenant isolation", dev_integrations: "Jira / GitHub",
    channel_whatsapp: "WhatsApp", channel_voice: "Phone", channel_social: "Social inbox", channel_sms: "SMS",
};

// Fallback plans configuration if backend endpoint is unavailable or returning non-standard structure
const FALLBACK_PLANS = {
    app: "supportops",
    plans: [
        {
            key: "starter",
            name: "Starter",
            priceCents: 4900,
            limits: { seats: 3, ai_resolutions: 500 },
            features: ["triage_basic", "channel_email", "channel_web"]
        },
        {
            key: "growth",
            name: "Growth",
            priceCents: 14900,
            limits: { seats: 10, ai_resolutions: 2500 },
            features: ["triage_basic", "channel_email", "channel_web", "helpdesk_sync", "webhooks", "rbac"]
        },
        {
            key: "enterprise",
            name: "Enterprise",
            priceCents: null,
            limits: { seats: null, ai_resolutions: null },
            features: ["triage_basic", "channel_email", "channel_web", "helpdesk_sync", "sla_predict", "webhooks", "sso", "rbac", "audit_logs", "tenant_isolation"]
        }
    ],
    addons: [
        { key: "channel_whatsapp", name: "WhatsApp Channel Integration", priceCents: 2900 },
        { key: "dev_integrations", name: "Jira / GitHub Integrations", priceCents: 1900 }
    ]
};

const money = (cents) => (cents == null ? "Custom" : `$${(cents / 100).toLocaleString()}`);

async function call(method, url, body) {
    const token = localStorage.getItem("authToken");
    const org = localStorage.getItem("activeOrgId");

    const headers = {};
    if (body) headers["Content-Type"] = "application/json";
    if (token && token !== "undefined" && token !== "null") headers["Authorization"] = `Bearer ${token}`;
    if (org && org !== "undefined" && org !== "null") headers["X-Org-Id"] = org;

    const res = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.message || `Request failed (${res.status})`);
    if (data === null) throw new Error("The server did not respond with JSON.");
    return data;
}

export default function PricingPage() {
    const navigate = useNavigate();
    const me = useApp("supportops");
    const { isAuth } = useAuth();
    const goAuth = (to) => { rememberReturn(ROUTES.pricing); navigate(to); };

    const [app, setApp] = useState(null);
    const [picked, setPicked] = useState([]);
    const [busy, setBusy] = useState(null);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState(null);

    const fetchPlans = async () => {
        setLoading(true);
        setFetchError(null);
        try {
            const result = await call("GET", API_ENDPOINTS.billing.plans("supportops"));

            let targetApp = null;
            if (Array.isArray(result)) {
                targetApp = result.find((a) => a.app === "supportops" || a.key === "supportops") ?? result[0] ?? null;
            } else if (result && typeof result === "object") {
                targetApp = result.plans ? result : (result.data ?? null);
            }

            setApp(targetApp || FALLBACK_PLANS);
        } catch (e) {
            console.warn("Could not load dynamic pricing plans, serving fallback configuration:", e.message);
            setApp(FALLBACK_PLANS);
            setFetchError(e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPlans();
    }, []);

    async function startTrial() {
        if (!isAuth) return goAuth(ROUTES.signup);
        setBusy("trial");
        try {
            await call("POST", API_ENDPOINTS.billing.trial, { app: "supportops" });
            await me.refresh();
            toast.success("Your 14-day trial has started");
            navigate(homeForRole("admin"), { replace: true });
        } catch (e) {
            toast.error(e.message);
        } finally {
            setBusy(null);
        }
    }

    async function checkout(plan) {
        if (!isAuth) return goAuth(ROUTES.signup);
        setBusy(plan);
        try {
            const { url } = await call("POST", API_ENDPOINTS.billing.checkout, { app: "supportops", plan, addons: picked });
            window.location.href = url;
        } catch (e) {
            toast.error(e.message);
            setBusy(null);
        }
    }

    const toggle = (key) => setPicked((p) => (p.includes(key) ? p.filter((k) => k !== key) : [...p, key]));

    return (
        <div className="min-h-screen bg-[#030712] text-slate-100 px-4 sm:px-6 lg:px-8 py-12">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-center">
                    Pick the plan that fits your team
                </h1>
                <p className="text-center text-slate-400 mt-2 mb-10">
                    Start with a 14-day free trial (up to 100 AI resolutions). No card needed.
                </p>

                {!isAuth && (
                    <p className="text-center text-sm text-slate-500 -mt-6 mb-8">
                        Already have an account?{" "}
                        <button type="button" onClick={() => goAuth(ROUTES.login)} className="text-blue-400 hover:underline font-medium">
                            Log in
                        </button>
                    </p>
                )}

                {loading ? (
                    <div className="text-center py-16 space-y-3">
                        <RefreshCw className="w-6 h-6 text-indigo-400 animate-spin mx-auto" />
                        <p className="text-slate-400 text-sm">Loading plans…</p>
                    </div>
                ) : !app || !app.plans ? (
                    <div className="text-center py-12 bg-slate-900/40 rounded-2xl border border-slate-800">
                        <p className="text-slate-400 mb-4">Unable to load plans right now.</p>
                        <button
                            onClick={fetchPlans}
                            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-all inline-flex items-center gap-2"
                        >
                            <RefreshCw className="w-4 h-4" /> Retry
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="grid md:grid-cols-3 gap-6">
                            {app.plans.map((p) => {
                                const current = me.plan === p.key && me.status === "active";
                                const featured = p.key === "growth";
                                return (
                                    <div key={p.key} className={`rounded-2xl p-6 flex flex-col border ${featured ? "border-indigo-500 bg-indigo-600/5 shadow-lg shadow-indigo-500/10" : "border-slate-800 bg-slate-900/40"}`}>
                                        <h2 className="text-lg font-bold">{p.name}</h2>
                                        <p className="mt-2">
                                            <span className="text-3xl font-extrabold">{money(p.priceCents)}</span>
                                            {p.priceCents != null && <span className="text-slate-400 text-sm"> / month</span>}
                                        </p>
                                        <ul className="mt-5 space-y-2 text-sm text-slate-300 flex-1">
                                            <li className="flex gap-2">
                                                <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                                                {p.limits?.seats == null ? "Unlimited seats" : `Up to ${p.limits.seats} seats`}
                                            </li>
                                            <li className="flex gap-2">
                                                <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                                                {p.limits?.ai_resolutions == null ? "Custom AI resolution volume" : `${p.limits.ai_resolutions.toLocaleString()} AI resolutions / month`}
                                            </li>
                                            {(p.features || []).filter((f) => !f.startsWith("channel_") || p.features.length < 8).map((f) => (
                                                <li key={f} className="flex gap-2">
                                                    <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                                                    {LABELS[f] ?? f}
                                                </li>
                                            ))}
                                            {(p.features || []).filter((f) => f.startsWith("channel_")).length >= 6 && (
                                                <li className="flex gap-2">
                                                    <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                                                    All channels included
                                                </li>
                                            )}
                                        </ul>

                                        <div className="mt-6 space-y-2">
                                            {p.priceCents == null ? (
                                                <a href="mailto:sales@nexuscore.app?subject=SupportOps%20Enterprise" className="block text-center px-4 py-2.5 rounded-lg border border-slate-700 hover:bg-white/5 text-sm font-semibold transition-all">
                                                    Contact sales
                                                </a>
                                            ) : current ? (
                                                <button disabled className="w-full px-4 py-2.5 rounded-lg bg-slate-800 text-slate-400 text-sm font-semibold">
                                                    Current plan
                                                </button>
                                            ) : (
                                                <>
                                                    {featured && !me.subscribed && (
                                                        <button onClick={startTrial} disabled={busy} className="w-full px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50">
                                                            {busy === "trial" ? "Starting…" : isAuth ? "Start 14-day free trial" : "Sign up for a free trial"}
                                                        </button>
                                                    )}
                                                    <button onClick={() => checkout(p.key)} disabled={busy} className="w-full px-4 py-2.5 rounded-lg border border-slate-700 hover:bg-white/5 text-sm font-semibold transition-all disabled:opacity-50">
                                                        {busy === p.key ? "Redirecting…" : isAuth ? "Subscribe now" : "Sign up to subscribe"}
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {app.addons && app.addons.length > 0 && (
                            <section className="mt-10 rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
                                <h2 className="font-semibold mb-1">Add-ons</h2>
                                <p className="text-xs text-slate-500 mb-4">Added to the plan you subscribe to. Enterprise already includes them.</p>
                                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {app.addons.map((a) => (
                                        <label key={a.key} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-800 cursor-pointer hover:bg-white/5 transition-colors">
                                            <span className="flex items-center gap-3 text-sm">
                                                <input type="checkbox" className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500" checked={picked.includes(a.key)} onChange={() => toggle(a.key)} />
                                                {a.name}
                                            </span>
                                            <span className="text-xs text-slate-400 font-mono">{money(a.priceCents)}/mo</span>
                                        </label>
                                    ))}
                                </div>
                            </section>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}