// supportops/src/pages/PricingPage.jsx - Guest-First Direct Checkout & Workspace Setup
import React, { useContext, useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Check, RefreshCw, ShieldAlert, Building2, X, ArrowRight, Sparkles } from "lucide-react";
import { API_ENDPOINTS, ROUTES } from "../config/paths";
import { AccessContext, useAccess } from "../context/AccessProvider";
import { useAuth } from "../context/AuthProvider";
import { rememberReturn } from "../components/Access";
import { apiFetch } from "../lib/api";

const LABELS = {
    triage_basic: "Basic triage",
    channel_email: "Email",
    channel_web: "In-app chat",
    helpdesk_sync: "Intercom / Zendesk sync",
    sla_predict: "Predictive SLA engine",
    webhooks: "Custom webhook triggers",
    sso: "SSO",
    rbac: "Role-based access control",
    audit_logs: "Audit logs & exports",
    tenant_isolation: "Dedicated tenant isolation",
    dev_integrations: "Jira / GitHub",
    channel_whatsapp: "WhatsApp",
    channel_voice: "Phone",
    channel_social: "Social inbox",
    channel_sms: "SMS",
};

// Fallback pricing configuration
const FALLBACK_PLANS = {
    app: "supportops",
    plans: [
        {
            key: "starter",
            name: "Starter",
            priceCents: 4900,
            limits: { seats: 3, ai_resolutions: 500 },
            features: ["triage_basic", "channel_email", "channel_web"],
        },
        {
            key: "growth",
            name: "Growth",
            priceCents: 14900,
            limits: { seats: 10, ai_resolutions: 2500 },
            features: [
                "triage_basic",
                "channel_email",
                "channel_web",
                "helpdesk_sync",
                "webhooks",
                "rbac",
            ],
        },
        {
            key: "enterprise",
            name: "Enterprise",
            priceCents: null,
            limits: { seats: null, ai_resolutions: null },
            features: [
                "triage_basic",
                "channel_email",
                "channel_web",
                "helpdesk_sync",
                "sla_predict",
                "webhooks",
                "sso",
                "rbac",
                "audit_logs",
                "tenant_isolation",
            ],
        },
    ],
    addons: [
        { key: "channel_whatsapp", name: "WhatsApp Channel Integration", priceCents: 2900 },
        { key: "dev_integrations", name: "Jira / GitHub Integrations", priceCents: 1900 },
    ],
};

const money = (cents) => (cents == null ? "Custom" : `$${(cents / 100).toLocaleString()}`);
const needsBillingRole = (msg = "") => /owner|admin|billing contact/i.test(msg);

export default function PricingPage() {
    const navigate = useNavigate();
    const access = useAccess();
    const rawAccessContext = useContext(AccessContext);
    const { user, isAuthenticated } = useAuth();

    const isAuth = isAuthenticated || !!user;

    const [app, setApp] = useState(null);
    const [usingFallback, setUsingFallback] = useState(false);
    const [picked, setPicked] = useState([]);
    const [busy, setBusy] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showAdminModal, setShowAdminModal] = useState(false);

    // Guest Workspace Modal State
    const [showSetupModal, setShowSetupModal] = useState(false);
    const [pendingSelection, setPendingSelection] = useState({ planKey: null, mode: "checkout" });
    const [guestForm, setGuestForm] = useState({
        email: "",
        workspaceName: "",
        fullName: "",
    });

    const orgs = access?.orgs || rawAccessContext?.orgs || [];
    const activeOrgId = access?.activeOrgId || rawAccessContext?.activeOrgId;
    const personal = orgs.find((o) => o.type === "PERSONAL");
    const inSomeoneElsesWorkspace = Boolean(personal && activeOrgId && activeOrgId !== personal.id);

    const fetchPlans = useCallback(async () => {
        setLoading(true);

        const configuredEndpoint =
            typeof API_ENDPOINTS?.billing?.plans === "function"
                ? API_ENDPOINTS.billing.plans("supportops")
                : API_ENDPOINTS?.billing?.plans;

        const candidateEndpoints = [
            configuredEndpoint,
            "/api/billing/plans?app=supportops",
            "/api/plans?app=supportops",
            "/api/v1/billing/plans?app=supportops",
        ].filter((ep, idx, arr) => ep && arr.indexOf(ep) === idx);

        let fetchedData = null;

        for (const endpoint of candidateEndpoints) {
            try {
                const res = await apiFetch(endpoint, { timeout: 45000 });
                if (res) {
                    fetchedData = res;
                    break;
                }
            } catch (err) {
                console.warn(`[PricingPage] Endpoint failed (${endpoint}):`, err.message);
            }
        }

        if (fetchedData) {
            let payload = fetchedData;
            if (payload && typeof payload === "object" && !Array.isArray(payload) && payload.data) {
                payload = payload.data;
            }

            let target = null;
            if (Array.isArray(payload)) {
                target = payload.find((a) => a.app === "supportops" || a.key === "supportops") ?? payload[0] ?? null;
            } else if (payload && typeof payload === "object") {
                target = payload.plans ? payload : (payload.data ?? null);
            }

            if (target && Array.isArray(target.plans)) {
                setApp(target);
                setUsingFallback(false);
                setLoading(false);
                return;
            }
        }

        setApp(FALLBACK_PLANS);
        setUsingFallback(true);
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchPlans();
    }, [fetchPlans]);

    // Direct Guest Provisioning + Checkout Handler
    async function processDirectCheckout(planKey, mode = "checkout") {
        if (!isAuth) {
            setPendingSelection({ planKey, mode });
            setShowSetupModal(true);
            return;
        }

        setBusy(planKey);
        try {
            if (mode === "trial") {
                const trialEndpoint = API_ENDPOINTS?.billing?.trial || "/api/billing/trial";
                const res = await apiFetch(trialEndpoint, {
                    method: "POST",
                    body: { app: "supportops" },
                });

                if (res?.token) localStorage.setItem("authToken", res.token);
                if (access?.refresh) await access.refresh();

                toast.success("Your 14-day trial has started");
                const adminTarget = ROUTES?.admin?.executive || ROUTES?.adminDashboard || "/admin";
                window.location.assign(adminTarget);
            } else {
                const checkoutEndpoint = API_ENDPOINTS?.billing?.checkout || "/api/billing/checkout";
                const res = await apiFetch(checkoutEndpoint, {
                    method: "POST",
                    body: { app: "supportops", plan: planKey, addons: picked },
                });

                if (res?.url) {
                    window.location.href = res.url;
                } else {
                    toast.success(`Subscribed to ${planKey} plan`);
                }
            }
        } catch (e) {
            if (needsBillingRole(e.message)) setShowAdminModal(true);
            else toast.error(e.message || "Action failed");
        } finally {
            setBusy(null);
        }
    }

    // Guest submission handler for setting up workspace and going directly to checkout
    async function handleGuestWorkspaceSubmit(e) {
        e.preventDefault();
        if (!guestForm.email || !guestForm.workspaceName) {
            toast.error("Please enter an email and workspace name");
            return;
        }

        setBusy("guest_provision");
        try {
            const setupEndpoint = "/api/billing/guest-checkout";
            const res = await apiFetch(setupEndpoint, {
                method: "POST",
                body: {
                    app: "supportops",
                    email: guestForm.email.trim(),
                    workspaceName: guestForm.workspaceName.trim(),
                    fullName: guestForm.fullName.trim(),
                    plan: pendingSelection.planKey,
                    mode: pendingSelection.mode,
                    addons: picked,
                },
            });

            if (res?.token) {
                localStorage.setItem("authToken", res.token);
                localStorage.setItem("token", res.token);
            }

            if (res?.url) {
                window.location.href = res.url;
            } else {
                toast.success("Workspace created! Redirecting to dashboard...");
                window.location.assign("/admin");
            }
        } catch (err) {
            console.error("[Guest Checkout Error]", err);
            toast.error(err.message || "Failed to setup workspace and billing");
        } finally {
            setBusy(null);
            setShowSetupModal(false);
        }
    }

    const toggle = (key) =>
        setPicked((p) => (p.includes(key) ? p.filter((k) => k !== key) : [...p, key]));

    const locked = Boolean(busy);

    return (
        <div className="min-h-screen bg-[#030712] text-slate-100 px-4 sm:px-6 lg:px-8 py-12 relative">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-center">
                    Pick the plan that fits your team
                </h1>
                <p className="text-center text-slate-400 mt-2 mb-10">
                    Set up your workspace and start instantly. No registration hurdles required.
                </p>

                {usingFallback && !loading && (
                    <div className="mb-8 flex items-center justify-between gap-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                        <span>Showing estimated plans while live pricing connects to the server.</span>
                        <button
                            type="button"
                            onClick={fetchPlans}
                            className="shrink-0 font-semibold underline underline-offset-2 hover:text-white"
                        >
                            Retry live load
                        </button>
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
                                const priceCents =
                                    p.priceCents ?? p.price_cents ?? (p.price != null ? p.price * 100 : null);
                                const seatsLimit = p.limits?.seats;
                                const aiResolutionsLimit = p.limits?.ai_resolutions ?? p.limits?.aiResolutions;
                                const features = p.features || [];

                                const current = access?.plan === p.key && access?.subscriptionStatus === "active";
                                const featured = p.key === "growth";

                                return (
                                    <div
                                        key={p.key}
                                        className={`rounded-2xl p-6 flex flex-col border ${featured
                                            ? "border-indigo-500 bg-indigo-600/5 shadow-lg shadow-indigo-500/10"
                                            : "border-slate-800 bg-slate-900/40"
                                            }`}
                                    >
                                        <h2 className="text-lg font-bold">{p.name}</h2>
                                        <p className="mt-2">
                                            <span className="text-3xl font-extrabold">{money(priceCents)}</span>
                                            {priceCents != null && <span className="text-slate-400 text-sm"> / month</span>}
                                        </p>
                                        <ul className="mt-5 space-y-2 text-sm text-slate-300 flex-1">
                                            <li className="flex gap-2">
                                                <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                                                {seatsLimit == null ? "Unlimited seats" : `Up to ${seatsLimit} seats`}
                                            </li>
                                            <li className="flex gap-2">
                                                <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                                                {aiResolutionsLimit == null
                                                    ? "Custom AI resolution volume"
                                                    : `${aiResolutionsLimit.toLocaleString()} AI resolutions / month`}
                                            </li>
                                            {features
                                                .filter((f) => !f.startsWith("channel_") || features.length < 8)
                                                .map((f) => (
                                                    <li key={f} className="flex gap-2">
                                                        <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                                                        {LABELS[f] ?? f}
                                                    </li>
                                                ))}
                                        </ul>

                                        <div className="mt-6 space-y-2">
                                            {priceCents == null ? (
                                                <a
                                                    href="mailto:sales@nexuscore.app?subject=SupportOps%20Enterprise"
                                                    className="block text-center px-4 py-2.5 rounded-lg border border-slate-700 hover:bg-white/5 text-sm font-semibold transition-all"
                                                >
                                                    Contact sales
                                                </a>
                                            ) : current ? (
                                                <button
                                                    disabled
                                                    className="w-full px-4 py-2.5 rounded-lg bg-slate-800 text-slate-400 text-sm font-semibold"
                                                >
                                                    Current plan
                                                </button>
                                            ) : (
                                                <>
                                                    {featured && !access?.isSubscribed && (
                                                        <button
                                                            onClick={() => processDirectCheckout(p.key, "trial")}
                                                            disabled={locked}
                                                            className="w-full px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                                        >
                                                            {busy === "trial" ? "Processing..." : "Start 14-day trial"}
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => processDirectCheckout(p.key, "checkout")}
                                                        disabled={locked}
                                                        className="w-full px-4 py-2.5 rounded-lg border border-slate-700 hover:bg-white/5 text-sm font-semibold transition-all disabled:opacity-50"
                                                    >
                                                        {busy === p.key ? "Redirecting…" : "Subscribe & Setup Workspace"}
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
                                <p className="text-xs text-slate-500 mb-4">
                                    Added to your selected workspace plan. Enterprise includes all channels.
                                </p>
                                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {app.addons.map((a) => (
                                        <label
                                            key={a.key}
                                            className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-800 cursor-pointer hover:bg-white/5 transition-colors"
                                        >
                                            <span className="flex items-center gap-3 text-sm">
                                                <input
                                                    type="checkbox"
                                                    className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
                                                    checked={picked.includes(a.key)}
                                                    onChange={() => toggle(a.key)}
                                                />
                                                {a.name}
                                            </span>
                                            <span className="text-xs text-slate-400 font-mono">
                                                {money(a.priceCents ?? a.price_cents)}/mo
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </section>
                        )}
                    </>
                )}
            </div>

            {/* Guest Direct Setup Modal */}
            {showSetupModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
                        <button
                            onClick={() => setShowSetupModal(false)}
                            aria-label="Close"
                            className="absolute top-5 right-5 text-slate-400 hover:text-slate-200 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="flex items-center gap-3 mb-2 text-indigo-400">
                            <div className="p-2.5 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
                                <Sparkles className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white">Setup Your Workspace</h3>
                                <p className="text-xs text-slate-400">No account creation required to checkout.</p>
                            </div>
                        </div>

                        <form onSubmit={handleGuestWorkspaceSubmit} className="space-y-4 mt-6">
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                                    Workspace Name
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. Acme Support"
                                    required
                                    value={guestForm.workspaceName}
                                    onChange={(e) => setGuestForm({ ...guestForm, workspaceName: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                                    Work Email
                                </label>
                                <input
                                    type="email"
                                    placeholder="admin@acme.com"
                                    required
                                    value={guestForm.email}
                                    onChange={(e) => setGuestForm({ ...guestForm, email: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                                    Full Name
                                </label>
                                <input
                                    type="text"
                                    placeholder="Alex Mercer"
                                    value={guestForm.fullName}
                                    onChange={(e) => setGuestForm({ ...guestForm, fullName: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={busy === "guest_provision"}
                                className="w-full mt-4 py-3.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {busy === "guest_provision" ? (
                                    "Provisioning Workspace..."
                                ) : (
                                    <>
                                        Continue to Billing <ArrowRight className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Workspace Admin Modal */}
            {showAdminModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl relative">
                        <button
                            onClick={() => setShowAdminModal(false)}
                            aria-label="Close"
                            className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="flex items-center gap-3 mb-4 text-amber-400">
                            <div className="p-2 bg-amber-500/10 rounded-xl border border-amber-500/20">
                                <ShieldAlert className="w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-bold text-white">Only a workspace admin can change the plan</h3>
                        </div>

                        <p className="text-sm text-slate-300 leading-relaxed mb-5">
                            You're a member of this workspace, so billing is managed by its{" "}
                            <strong className="text-white">owner</strong> or an{" "}
                            <strong className="text-white">admin</strong>. Ask them to change the plan.
                            {inSomeoneElsesWorkspace && " Or start a separate plan for your own workspace."}
                        </p>

                        <div className="flex flex-col gap-2.5">
                            {inSomeoneElsesWorkspace && (
                                <button
                                    onClick={() => access?.switchOrg?.(personal.id)}
                                    className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm rounded-xl shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-2"
                                >
                                    <Building2 className="w-4 h-4" /> Use my own workspace
                                </button>
                            )}
                            <button
                                onClick={() => setShowAdminModal(false)}
                                className="w-full py-2 px-4 text-slate-400 hover:text-slate-200 font-medium text-sm rounded-xl transition-all"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}