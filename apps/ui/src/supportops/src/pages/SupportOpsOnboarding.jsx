import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, Loader2 } from "lucide-react";

const DEFAULT_API = (import.meta.env.VITE_SUPPORTOPS_API_URL || import.meta.env.VITE_BACKEND_API_URL || import.meta.env.VITE_API_URL || "https://nexus-core-a0px.onrender.com").replace(/\/$/, "").replace(/\/api\/v1$/, "").replace(/\/api$/, "");

export default function SupportOpsOnboarding() {
    const [params, setParams] = useState({ plan: "growth", type: "trial" });
    const [formData, setFormData] = useState({ companyName: "", adminName: "", adminEmail: "", password: "", teamSize: "1-5", primaryChannel: "email" });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        const query = new URLSearchParams(window.location.search);
        setParams({ plan: query.get("plan") || "growth", type: query.get("type") || "trial" });
    }, []);

    const endpoint = useMemo(() => `${DEFAULT_API}/api/v1/billing/guest-checkout`, []);
    const change = (event) => setFormData((current) => ({ ...current, [event.target.name]: event.target.value }));

    async function submit(event) {
        event.preventDefault();
        setError("");
        if (formData.password.length < 8) return setError("Your password must contain at least 8 characters.");
        setLoading(true);
        try {
            const response = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json", "X-App-Slug": "supportops" },
                body: JSON.stringify({
                    app: "supportops",
                    mode: params.type === "trial" ? "trial" : "checkout",
                    plan: params.plan === "price_supportops_growth" ? "growth" : params.plan,
                    workspaceName: formData.companyName.trim(),
                    fullName: formData.adminName.trim(),
                    email: formData.adminEmail.trim().toLowerCase(),
                    password: formData.password,
                    teamSize: formData.teamSize,
                    primaryChannel: formData.primaryChannel,
                    addons: [],
                }),
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok || !data.success) throw new Error(data.message || data.error || "We couldn't create your SupportOps workspace.");
            if (data.token) {
                localStorage.setItem("token", data.token);
                localStorage.setItem("authToken", data.token);
            }
            if (data.orgId) {
                localStorage.setItem("activeOrgId", data.orgId);
                localStorage.setItem("orgId", data.orgId);
            }
            localStorage.setItem("supportops_trial_ends_at", data.trialEndsAt || "");
            window.location.assign(data.dashboardUrl || data.redirectTo || "/supportops/admin/executive");
        } catch (err) {
            setError(err.message || "An error occurred during workspace setup.");
        } finally {
            setLoading(false);
        }
    }

    const input = "w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white outline-none focus:border-cyan-500";
    return <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10 text-white">
        <section className="w-full max-w-2xl space-y-6 rounded-2xl border border-slate-800 bg-slate-900 p-7 shadow-2xl sm:p-9">
            <header className="text-center">
                <Link to="/supportops" className="mb-5 inline-flex items-center gap-2 text-cyan-400"><ShieldCheck /> SupportOps</Link>
                <p className="mx-auto mb-3 w-fit rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-cyan-300">{params.type === "trial" ? "14-day free trial" : "Workspace setup"}</p>
                <h1 className="text-2xl font-bold">Create your administrator workspace</h1>
                <p className="mt-2 text-sm text-slate-400">Your account becomes the workspace owner. Team members join only through administrator invitations.</p>
            </header>
            {error && <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>}
            <form onSubmit={submit} className="space-y-4">
                <label className="block text-xs text-slate-300">Company / workspace name<input className={`${input} mt-1`} name="companyName" required minLength={2} maxLength={120} value={formData.companyName} onChange={change} placeholder="Acme Cloud Systems" /></label>
                <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block text-xs text-slate-300">Administrator full name<input className={`${input} mt-1`} name="adminName" required maxLength={120} value={formData.adminName} onChange={change} placeholder="Full name" /></label>
                    <label className="block text-xs text-slate-300">Work email<input className={`${input} mt-1`} type="email" name="adminEmail" required maxLength={254} value={formData.adminEmail} onChange={change} placeholder="admin@company.com" /></label>
                </div>
                <label className="block text-xs text-slate-300">Account password<input className={`${input} mt-1`} type="password" name="password" required minLength={8} maxLength={128} autoComplete="new-password" value={formData.password} onChange={change} placeholder="At least 8 characters" /></label>
                <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block text-xs text-slate-300">Estimated team size<select className={`${input} mt-1`} name="teamSize" value={formData.teamSize} onChange={change}><option value="1-5">1–5 seats</option><option value="6-20">6–20 seats</option><option value="21-50">21–50 seats</option><option value="50+">50+ enterprise seats</option></select></label>
                    <label className="block text-xs text-slate-300">Primary support channel<select className={`${input} mt-1`} name="primaryChannel" value={formData.primaryChannel} onChange={change}><option value="email">Email / support desk</option><option value="inapp">In-app chat widget</option><option value="zendesk">Zendesk / Intercom sync</option><option value="api">Custom API / webhooks</option></select></label>
                </div>
                <button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-3 font-semibold text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-60">{loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating workspace…</> : "Create admin workspace & start trial"}</button>
                <p className="text-center text-xs text-slate-500">14 days on Growth, with the trial usage limits shown in your workspace. No team member receives access until invited.</p>
            </form>
            <p className="text-center text-sm text-slate-400">Already have an account? <Link className="text-cyan-400 hover:text-cyan-300" to="/supportops/login">Sign in</Link></p>
        </section>
    </main>;
}
