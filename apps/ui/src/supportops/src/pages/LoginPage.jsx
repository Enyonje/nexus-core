import React, { useState } from 'react';

export default function LoginPage() {
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'https://nexus-core-a0px.onrender.com/api/v1').replace(/\/$/, '');

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const res = await fetch(`${API_BASE}/supportops/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Invalid email or password.');
            }

            // Store JWT token / session
            if (data.token) {
                localStorage.setItem('supportops_token', data.token);
            }

            // Redirect to the Super Admin Dashboard
            window.location.href = data.redirectUrl || '/supportops/admin';
        } catch (err) {
            console.error('[Login Error]:', err);
            setError(err.message || 'Failed to authenticate. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
            <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6">

                {/* Header Badge & Title */}
                <div className="text-center space-y-2">
                    <span className="inline-block px-3 py-1 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-semibold rounded-full uppercase tracking-wider">
                        SupportOps Auth
                    </span>
                    <h1 className="text-2xl font-bold text-white">Welcome Back</h1>
                    <p className="text-slate-400 text-sm">
                        Sign in to your autonomous AI triage workspace.
                    </p>
                </div>

                {error && (
                    <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl">
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">Work Email</label>
                        <input
                            type="email"
                            name="email"
                            required
                            placeholder="admin@company.com"
                            value={formData.email}
                            onChange={handleChange}
                            className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-cyan-500 text-sm"
                        />
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="block text-xs font-medium text-slate-300">Password</label>
                            <a href="/supportops/forgot-password" class="text-xs text-cyan-400 hover:underline">Forgot password?</a>
                        </div>
                        <input
                            type="password"
                            name="password"
                            required
                            placeholder="••••••••••••"
                            value={formData.password}
                            onChange={handleChange}
                            className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-cyan-500 text-sm"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-semibold py-3 px-4 rounded-xl transition-colors mt-2 shadow-lg shadow-cyan-600/20"
                    >
                        {loading ? 'Authenticating...' : 'Sign In to Dashboard'}
                    </button>
                </form>

                <div className="text-center text-xs text-slate-500 pt-4 border-t border-slate-800">
                    Don't have an active workspace?{' '}
                    <a href="/supportops/pricing" className="text-cyan-400 font-medium hover:underline">
                        View plans &amp; start trial
                    </a>
                </div>
            </div>
        </div>
    );
}