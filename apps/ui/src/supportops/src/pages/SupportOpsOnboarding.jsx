import React, { useState, useEffect } from 'react';

export default function SupportOpsOnboarding() {
    const [params, setParams] = useState({ plan: 'price_supportops_growth', type: 'trial', sessionId: null });
    const [formData, setFormData] = useState({
        companyName: '',
        adminName: '',
        adminEmail: '',
        password: '',
        teamSize: '1-5',
        primaryChannel: 'email',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'https://nexus-core-a0px.onrender.com/api/v1').replace(/\/$/, '');

    // Parse URL query parameters on load (?plan=...&type=...&session_id=...)
    useEffect(() => {
        const searchParams = new URLSearchParams(window.location.search);
        setParams({
            plan: searchParams.get('plan') || 'price_supportops_growth',
            type: searchParams.get('type') || 'trial',
            sessionId: searchParams.get('session_id') || null,
        });
    }, []);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const payload = {
                ...formData,
                planId: params.plan,
                onboardingType: params.type,
                stripeSessionId: params.sessionId,
            };

            const res = await fetch(`${API_BASE}/supportops/provision-workspace`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Failed to provision workspace.');
            }

            // Store auth state / token if returned
            if (data.token) {
                localStorage.setItem('supportops_token', data.token);
            }

            // Redirect to the active SupportOps workspace dashboard
            window.location.href = data.dashboardUrl || '/supportops/admin';
        } catch (err) {
            console.error('[Onboarding Error]:', err);
            setError(err.message || 'An error occurred during workspace setup.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
            <div className="max-w-xl w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6">

                {/* Header Badge & Title */}
                <div className="text-center space-y-2">
                    <span className="inline-block px-3 py-1 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-semibold rounded-full uppercase tracking-wider">
                        {params.type === 'trial' ? '14-Day Free Trial Setup' : 'Workspace Provisioning'}
                    </span>
                    <h1 className="text-2xl font-bold text-white">Setup Your SupportOps Admin Account</h1>
                    <p className="text-slate-400 text-sm">
                        Configure your autonomous AI ticket triage engine and team workspace.
                    </p>
                </div>

                {error && (
                    <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">Company / Workspace Name</label>
                        <input
                            type="text"
                            name="companyName"
                            required
                            placeholder="e.g. Acme Cloud Systems"
                            value={formData.companyName}
                            onChange={handleChange}
                            className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-cyan-500 text-sm"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-300 mb-1">Admin Full Name</label>
                            <input
                                type="text"
                                name="adminName"
                                required
                                placeholder="Evans Nyonje"
                                value={formData.adminName}
                                onChange={handleChange}
                                className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-cyan-500 text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-300 mb-1">Admin Work Email</label>
                            <input
                                type="email"
                                name="adminEmail"
                                required
                                placeholder="admin@company.com"
                                value={formData.adminEmail}
                                onChange={handleChange}
                                className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-cyan-500 text-sm"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">Account Password</label>
                        <input
                            type="password"
                            name="password"
                            required
                            minLength={8}
                            placeholder="••••••••••••"
                            value={formData.password}
                            onChange={handleChange}
                            className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-cyan-500 text-sm"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-300 mb-1">Estimated Team Seats</label>
                            <select
                                name="teamSize"
                                value={formData.teamSize}
                                onChange={handleChange}
                                className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-cyan-500 text-sm"
                            >
                                <option value="1-5">1 - 5 seats</option>
                                <option value="6-20">6 - 20 seats</option>
                                <option value="21-50">21 - 50 seats</option>
                                <option value="50+">50+ Enterprise seats</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-300 mb-1">Primary Support Channel</label>
                            <select
                                name="primaryChannel"
                                value={formData.primaryChannel}
                                onChange={handleChange}
                                className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-cyan-500 text-sm"
                            >
                                <option value="email">Email / Support Desk</option>
                                <option value="inapp">In-App Chat Widget</option>
                                <option value="zendesk">Zendesk / Intercom Sync</option>
                                <option value="api">Custom API / Webhooks</option>
                            </select>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-semibold py-3 px-4 rounded-xl transition-colors mt-6 shadow-lg shadow-cyan-600/20"
                    >
                        {loading ? 'Provisioning Workspace...' : 'Create Admin Workspace & Launch'}
                    </button>
                </form>
            </div>
        </div>
    );
}