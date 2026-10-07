// supportops/src/pages/PricingPage.jsx - Plans, add-ons, free trial and checkout.
import React, { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Check, RefreshCw, ShieldAlert, Building2, X } from "lucide-react";
import { API_ENDPOINTS, ROUTES } from "../config/paths";
import { AccessContext, useApp } from "../../../context/AccessProvider";
import { useAuth } from "../context/AuthContext";
import { rememberReturn } from "../components/Access";

const LABELS = {
    triage_basic: "Basic triage", channel_email: "Email", channel_web: "In-app chat", helpdesk_sync: "Intercom / Zendesk sync",
    sla_predict: "Predictive SLA engine", webhooks: "Custom webhook triggers", sso: "SSO", rbac: "Role-based access control",
    audit_logs: "Audit logs & exports", tenant_isolation: "Dedicated tenant isolation", dev_integrations: "Jira / GitHub",
    channel_whatsapp: "WhatsApp", channel_voice: "Phone", channel_social: "Social inbox", channel_sms: "SMS",
};

// Shown ONLY when the live plans can't be loaded. These are sample figures, so purchasing is disabled while they show.
const FALLBACK_PLANS = {
    app: "supportops",
    plans: [
        { key: "starter", name: "Starter", priceCents: 4900, limits: { seats: 3, ai_resolutions: 500 }, features: ["triage_basic", "channel_email", "channel_web"] },
        { key: "growth", name: "Growth", priceCents: 14900, limits: { seats: 10, ai_resolutions: 2500 }, features: ["triage_basic", "channel_email", "channel_web", "helpdesk_sync", "webhooks", "rbac"] },
        { key: "enterprise", name: "Enterprise", priceCents: null, limits: { seats: null, ai_resolutions: null }, features: ["triage_basic", "channel_email", "channel_web", "helpdesk_sync", "sla_predict", "webhooks", "sso", "rbac", "audit_logs", "tenant_isolation"] },
    ],
    addons: [
        { key: "channel_whatsapp", name: "WhatsApp Channel Integration", priceCents: 2900 },
        { key: "dev_integrations", name: "Jira / GitHub Integrations", priceCents: 1900 },
    ],
};

const money = (cents) => (cents == null ? "Custom" : `$${(cents / 100).toLocaleString()}`);

async function call(method, url, body) {
    const token = localStorage.getItem("authToken");
    const org = localStorage.getItem("activeOrgId");

    const headers = {};
    if (body) headers["Content-Type"] = "application/json";
    if (token && token !== "undefined" && token !== "null") headers["Authorization"] = `Bearer ${token}`;
    if (org && org !== "undefined" && org !== "null") headers["X-Org-Id"] = org;

    const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });

    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.message || `Request failed (${res.status})`);
    if (data === null) throw new Error("The server did not respond with JSON.");
    return data;
}

const needsBillingRole = (msg = "") => /owner|admin|billing contact/i.test(msg);

export default function PricingPage() {
    const navigate = useNavigate();
    const me = useApp("supportops");
    const access = useContext(AccessContext);
    const { isAuth } = useAuth();
    const goAuth = (to) => { rememberReturn(ROUTES.pricing); navigate(to); };

    const [app, setApp] = useState(null);
    const [usingFallback, setUsingFallback] = useState(false);
    const [picked, setPicked] = useState([]);
    const [busy, setBusy] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showAdminModal, setShowAdminModal] = useState(false);

    // Invited members work inside their admin's workspace. To buy a plan of their own they use their personal workspace.
    const personal = access?.orgs?.find((o) => o.type === "PERSONAL");
    const inSomeoneElsesWorkspace = Boolean(personal && access.activeOrgId && access.activeOrgId !== personal.id);

    const fetchPlans = async () => {
        setLoading(true);
        try {
            const result = await call("GET", API_ENDPOINTS.billing.plans("supportops"));
            let target = null;
            if (Array.isArray(result)) target = result.find((a) => a.app === "supportops" || a.key === "supportops") ?? result[0] ?? null;
            else if (result && typeof result === "object") target = result.plans ? result : (result.data ?? null);
            setApp(target || FALLBACK_PLANS);
            setUsingFallback(!target);
        } catch (e) {
            console.warn("Could not load live pricing, showing sample plans:", e.message);
            setApp(FALLBACK_PLANS);
            setUsingFallback(true);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchPlans(); }, []);

    async function startTrial() {
        if (!isAuth) return goAuth(ROUTES.signup);
        setBusy("trial");
        try {
            await call("POST", API_ENDPOINTS.billing.trial, { app: "supportops" });
            // The person who starts the trial owns the workspace and is its SupportOps admin.
            // Drop any old "come back to" address (it would override this redirect) and do a full page load,
            // so the session, plan and role are all fresh before the admin dashboard renders.
            sessionStorage.removeItem("postAuthRedirect");
            toast.success("Your 14-day trial has started");
            window.location.assign(ROUTES.admin.executive);
            return;
        } catch (e) {
            if (needsBillingRole(e.message)) setShowAdminModal(true);
            else toast.error(e.message);
        }
        setBusy(null);
    }

    async function checkout(plan) {
        if (!isAuth) return goAuth(ROUTES.signup);
        setBusy(plan);
        try {
            const { url } = await call("POST", API_ENDPOINTS.billing.checkout, { app: "supportops", plan, addons: picked });
            window.location.href = url;
        } catch (e) {
            if (needsBillingRole(e.message)) setShowAdminModal(true);
            else toast.error(e.message);
            setBusy(null);
        }
    }

    const toggle = (key) => setPicked((p) => (p.includes(key) ? p.filter((k) => k !== key) : [...p, key]));
    const locked = Boolean(busy) || usingFallback;

    return (
        <div className="min-h-screen bg-[#030712] text-slate-100 px-4 sm:px-6 lg:px-8 py-12 relative">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-center">Pick the plan that fits your team</h1>
                <p className="text-center text-slate-400 mt-2 mb-10">Start with a 14-day free trial (up to 100 AI resolutions). No card needed.</p>

                {!isAuth && (
                    <p className="text-center text-sm text-slate-500 -mt-6 mb-8">
                        Already have an account?{" "}
                        <button type="button" onClick={() => goAuth(ROUTES.login)} className="text-blue-400 hover:underline font-medium">Log in</button>
                    </p>
                )}

                {usingFallback && !loading && (
                    <div className="mb-8 flex items-center justify-between gap-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                        <span>Live plans couldn't be loaded, so these are sample figures. Purchasing is paused until they load.</span>
                        <button type="button" onClick={fetchPlans} className="shrink-0 font-semibold underline underline-offset-2 hover:text-white">Retry</button>
                    </div>
                )}

                {loading ? (
                    <div className="text-center py-16 space-y-3">
                        <RefreshCw className="w-6 h-6 text-indigo-400 animate-spin mx-auto" />
                        <p className="text-slate-400 text-sm">Loading plans…</p>
                    </div>
                ) : !app || !app.plans ? (
                    <div className="text-center py-12 bg-slate-900/40 rounded-2xl border border-slate-800">
                        <p className="text-slate-400 mb-4">Unable to load plans right now.</p>
                        <button onClick={fetchPlans} className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-all inline-flex items-center gap-2">
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
                                            <li className="flex gap-2"><Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />{p.limits?.seats == null ? "Unlimited seats" : `Up to ${p.limits.seats} seats`}</li>
                                            <li className="flex gap-2"><Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />{p.limits?.ai_resolutions == null ? "Custom AI resolution volume" : `${p.limits.ai_resolutions.toLocaleString()} AI resolutions / month`}</li>
                                            {(p.features || []).filter((f) => !f.startsWith("channel_") || p.features.length < 8).map((f) => (
                                                <li key={f} className="flex gap-2"><Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />{LABELS[f] ?? f}</li>
                                            ))}
                                            {(p.features || []).filter((f) => f.startsWith("channel_")).length >= 6 && (
                                                <li className="flex gap-2"><Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />All channels included</li>
                                            )}
                                        </ul>

                                        <div className="mt-6 space-y-2">
                                            {p.priceCents == null ? (
                                                <a href="mailto:sales@nexuscore.app?subject=SupportOps%20Enterprise" className="block text-center px-4 py-2.5 rounded-lg border border-slate-700 hover:bg-white/5 text-sm font-semibold transition-all">Contact sales</a>
                                            ) : current ? (
                                                <button disabled className="w-full px-4 py-2.5 rounded-lg bg-slate-800 text-slate-400 text-sm font-semibold">Current plan</button>
                                            ) : (
                                                <>
                                                    {featured && !me.subscribed && (
                                                        <button onClick={startTrial} disabled={locked} className="w-full px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50">
                                                            {busy === "trial" ? "Starting…" : isAuth ? "Start 14-day free trial" : "Sign up for a free trial"}
                                                        </button>
                                                    )}
                                                    <button onClick={() => checkout(p.key)} disabled={locked} className="w-full px-4 py-2.5 rounded-lg border border-slate-700 hover:bg-white/5 text-sm font-semibold transition-all disabled:opacity-50">
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

            {/* Shown when the signed-in person isn't an owner, admin or billing contact of the active workspace */}
            {showAdminModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl relative">
                        <button onClick={() => setShowAdminModal(false)} aria-label="Close" className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 transition-colors"><X className="w-5 h-5" /></button>

                        <div className="flex items-center gap-3 mb-4 text-amber-400">
                            <div className="p-2 bg-amber-500/10 rounded-xl border border-amber-500/20"><ShieldAlert className="w-6 h-6" /></div>
                            <h3 className="text-lg font-bold text-white">Only a workspace admin can change the plan</h3>
                        </div>

                        <p className="text-sm text-slate-300 leading-relaxed mb-5">
                            You're a member of this workspace, so billing is managed by its <strong className="text-white">owner</strong> or an <strong className="text-white">admin</strong>. Ask them to change the plan.
                            {inSomeoneElsesWorkspace && " Or start a separate plan for your own workspace."}
                        </p>

                        <div className="flex flex-col gap-2.5">
                            {inSomeoneElsesWorkspace && (
                                <button onClick={() => access.switchOrg(personal.id)} className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm rounded-xl shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-2">
                                    <Building2 className="w-4 h-4" /> Use my own workspace
                                </button>
                            )}
                            <button onClick={() => setShowAdminModal(false)} className="w-full py-2 px-4 text-slate-400 hover:text-slate-200 font-medium text-sm rounded-xl transition-all">Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}