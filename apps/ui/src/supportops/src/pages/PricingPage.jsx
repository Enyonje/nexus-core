// supportops/src/pages/PricingPage.jsx  Plans, add-ons, free trial and checkout.
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Check } from "lucide-react";
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
const money = (cents) => (cents == null ? "Custom" : `$${(cents / 100).toLocaleString()}`);

async function call(method, url, body) {
    const token = localStorage.getItem("authToken");
    const org = localStorage.getItem("activeOrgId");
    const res = await fetch(url, {
        method,
        headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(org ? { "X-Org-Id": org } : {}) },
        body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.message || `Request failed (${res.status})`);
    if (data === null) throw new Error("The server did not answer with JSON. Check that VITE_API_URL points at your API.");
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

    useEffect(() => {
        call("GET", API_ENDPOINTS.billing.plans("supportops"))
            .then((list) => setApp((Array.isArray(list) ? list : []).find((a) => a.app === "supportops") ?? null))
            .catch((e) => toast.error(e.message));
    }, []);

    async function startTrial() {
        if (!isAuth) return goAuth(ROUTES.signup);
        setBusy("trial");
        try {
            await call("POST", API_ENDPOINTS.billing.trial, { app: "supportops" });
            await me.refresh();
            toast.success("Your 14-day trial has started");
            navigate(homeForRole("admin"), { replace: true });
        } catch (e) { toast.error(e.message); } finally { setBusy(null); }
    }

    async function checkout(plan) {
        if (!isAuth) return goAuth(ROUTES.signup);
        setBusy(plan);
        try {
            const { url } = await call("POST", API_ENDPOINTS.billing.checkout, { app: "supportops", plan, addons: picked });
            window.location.href = url;
        } catch (e) { toast.error(e.message); setBusy(null); }
    }

    const toggle = (key) => setPicked((p) => (p.includes(key) ? p.filter((k) => k !== key) : [...p, key]));

    return (
        <div className="min-h-screen bg-[#030712] text-slate-100 px-4 sm:px-6 lg:px-8 py-12">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-center">Pick the plan that fits your team</h1>
                <p className="text-center text-slate-400 mt-2 mb-10">Start with a 14-day free trial (up to 100 AI resolutions). No card needed.</p>

                {!isAuth && (
                    <p className="text-center text-sm text-slate-500 -mt-6 mb-8">
                        Already have an account?{" "}
                        <button type="button" onClick={() => goAuth(ROUTES.login)} className="text-blue-400 hover:underline">Log in</button>
                    </p>
                )}

                {!app ? <p className="text-center text-slate-500">Loading plans…</p> : (
                    <>
                        <div className="grid md:grid-cols-3 gap-6">
                            {app.plans.map((p) => {
                                const current = me.plan === p.key && me.status === "active";
                                const featured = p.key === "growth";
                                return (
                                    <div key={p.key} className={`rounded-2xl p-6 flex flex-col border ${featured ? "border-blue-500 bg-blue-600/5" : "border-slate-800 bg-slate-900/40"}`}>
                                        <h2 className="text-lg font-bold">{p.name}</h2>
                                        <p className="mt-2"><span className="text-3xl font-extrabold">{money(p.priceCents)}</span>{p.priceCents != null && <span className="text-slate-400 text-sm"> / month</span>}</p>
                                        <ul className="mt-5 space-y-2 text-sm text-slate-300 flex-1">
                                            <li className="flex gap-2"><Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />{p.limits.seats == null ? "Unlimited seats" : `Up to ${p.limits.seats} seats`}</li>
                                            <li className="flex gap-2"><Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />{p.limits.ai_resolutions == null ? "Custom AI resolution volume" : `${p.limits.ai_resolutions.toLocaleString()} AI resolutions / month`}</li>
                                            {p.features.filter((f) => !f.startsWith("channel_") || p.features.length < 8).map((f) => (
                                                <li key={f} className="flex gap-2"><Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />{LABELS[f] ?? f}</li>
                                            ))}
                                            {p.features.filter((f) => f.startsWith("channel_")).length >= 6 && <li className="flex gap-2"><Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />All channels included</li>}
                                        </ul>

                                        <div className="mt-6 space-y-2">
                                            {p.priceCents == null ? (
                                                <a href="mailto:sales@nexuscore.app?subject=SupportOps%20Enterprise" className="block text-center px-4 py-2.5 rounded-lg border border-slate-600 hover:bg-white/5 text-sm font-semibold">Contact sales</a>
                                            ) : current ? (
                                                <button disabled className="w-full px-4 py-2.5 rounded-lg bg-slate-800 text-slate-400 text-sm">Current plan</button>
                                            ) : (
                                                <>
                                                    {featured && !me.subscribed && (
                                                        <button onClick={startTrial} disabled={busy} className="w-full px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-sm font-semibold disabled:opacity-50">
                                                            {busy === "trial" ? "Starting…" : isAuth ? "Start 14-day free trial" : "Sign up for a free trial"}
                                                        </button>
                                                    )}
                                                    <button onClick={() => checkout(p.key)} disabled={busy} className="w-full px-4 py-2.5 rounded-lg border border-slate-600 hover:bg-white/5 text-sm font-semibold disabled:opacity-50">
                                                        {busy === p.key ? "Redirecting…" : isAuth ? "Subscribe now" : "Sign up to subscribe"}
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {app.addons.length > 0 && (
                            <section className="mt-10 rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
                                <h2 className="font-semibold mb-1">Add-ons</h2>
                                <p className="text-xs text-slate-500 mb-4">Added to the plan you subscribe to. Enterprise already includes them.</p>
                                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {app.addons.map((a) => (
                                        <label key={a.key} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-800 cursor-pointer hover:bg-white/5">
                                            <span className="flex items-center gap-3 text-sm"><input type="checkbox" checked={picked.includes(a.key)} onChange={() => toggle(a.key)} />{a.name}</span>
                                            <span className="text-xs text-slate-400">{money(a.priceCents)}/mo</span>
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