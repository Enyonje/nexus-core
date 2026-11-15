import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { API_ENDPOINTS } from "../config/paths";

function formatPrice(cents, currency = "usd") {
    if (cents == null) return "Custom";
    return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: String(currency || "usd").toUpperCase(),
        maximumFractionDigits: 0,
    }).format(Number(cents) / 100);
}

function normalizeFeatures(features) {
    if (Array.isArray(features)) return features.filter((item) => typeof item === "string");
    if (features && typeof features === "object") {
        return Object.entries(features).map(([key, value]) =>
            typeof value === "boolean" ? (value ? key.replace(/_/g, " ") : null) : `${key.replace(/_/g, " ")}: ${value}`
        ).filter(Boolean);
    }
    return [];
}

export default function PricingPage() {
    const [tiers, setTiers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const controller = new AbortController();
        async function loadPlans() {
            setLoading(true);
            setError("");
            try {
                const response = await fetch(API_ENDPOINTS.billing.plans("supportops"), {
                    headers: { Accept: "application/json" },
                    signal: controller.signal,
                });
                const payload = await response.json().catch(() => null);
                if (!response.ok) throw new Error(payload?.message || payload?.error || `Pricing request failed (${response.status}).`);
                const app = Array.isArray(payload) ? payload.find((item) => item.app === "supportops") : null;
                const plans = Array.isArray(app?.plans) ? app.plans : [];
                if (!plans.length) throw new Error("No active SupportOps plans are configured yet.");
                setTiers(plans.map((plan) => ({
                    id: plan.key,
                    name: plan.name,
                    price: formatPrice(plan.priceCents, plan.currency || "usd"),
                    interval: "month",
                    features: normalizeFeatures(plan.features),
                    isEnterprise: plan.key === "enterprise" || plan.priceCents == null,
                    hasTrial: plan.key === "growth",
                })));
            } catch (err) {
                if (err.name !== "AbortError") setError(err.message || "Unable to load SupportOps pricing.");
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        }
        loadPlans();
        return () => controller.abort();
    }, []);

    function handleAction(tier, actionType) {
        if (tier.isEnterprise) {
            window.location.assign("/contact?ref=enterprise_supportops");
            return;
        }
        const type = actionType === "trial" ? "trial" : "checkout";
        const plan = type === "trial" ? "growth" : tier.id;
        window.location.assign(`/supportops/onboarding?plan=${encodeURIComponent(plan)}&type=${type}`);
    }

    if (loading) return <div className="min-h-[400px] flex items-center justify-center text-slate-400">Loading SupportOps plans…</div>;
    if (error) return <div className="min-h-[400px] flex flex-col items-center justify-center gap-4 text-red-400"><p role="alert">{error}</p><button onClick={() => window.location.reload()} className="rounded-lg bg-slate-800 px-4 py-2 text-white">Retry</button></div>;

    return (
        <div className="max-w-7xl mx-auto px-4 py-12 space-y-8">
            <div className="flex justify-end"><div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/80 px-4 py-2 text-sm text-slate-400"><span>Already have a workspace?</span><Link to="/supportops/login" className="font-semibold text-cyan-400 hover:text-cyan-300">Sign in →</Link></div></div>
            <div className="space-y-3 text-center"><h1 className="text-4xl font-bold text-white">SupportOps Plans &amp; Pricing</h1><p className="mx-auto max-w-2xl text-slate-400">AI-assisted customer support workflows. Compare plans or start a friction-free trial.</p></div>
            <div className="grid items-stretch gap-8 md:grid-cols-3">
                {tiers.map((tier) => (
                    <div key={tier.id} className={`flex flex-col justify-between space-y-6 rounded-2xl border bg-slate-900 p-8 ${tier.hasTrial ? "border-cyan-500/50 shadow-lg shadow-cyan-500/10" : "border-slate-800"}`}>
                        <div className="space-y-6"><div><h3 className="text-2xl font-bold text-white">{tier.name}</h3><div className="mt-4 flex items-baseline text-white"><span className="text-4xl font-extrabold tracking-tight">{tier.price}</span>{tier.price !== "Custom" && <span className="ml-1 text-sm text-slate-400">/{tier.interval}</span>}</div></div>
                            {!!tier.features.length && <ul className="space-y-3 text-sm text-slate-300">{tier.features.map((feature, index) => <li key={`${tier.id}-${index}`} className="flex items-start"><span className="mr-2 text-cyan-400">✓</span><span>{feature}</span></li>)}</ul>}
                        </div>
                        <div className="space-y-3 border-t border-slate-800/80 pt-6">
                            {tier.hasTrial && <button onClick={() => handleAction(tier, "trial")} className="w-full rounded-xl border border-cyan-500/30 bg-slate-800 px-4 py-3 font-semibold text-cyan-400 transition-colors hover:bg-slate-700">Start 14-day trial</button>}
                            <button onClick={() => handleAction(tier, "subscribe")} className="w-full rounded-xl bg-cyan-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-cyan-500">{tier.isEnterprise ? "Contact sales" : "Subscribe & Setup Workspace"}</button>
                        </div>
                    </div>
                ))}
            </div>
            <div className="pt-4 text-center text-sm text-slate-400">Already registered with SupportOps? <Link to="/supportops/login" className="font-semibold text-cyan-400 underline underline-offset-4">Sign in to your account</Link></div>
        </div>
    );
}
