import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const auth = useAuth();
  const location = useLocation();

  const handleChange = (event) => setFormData((current) => ({ ...current, [event.target.name]: event.target.value }));
  const handleLogin = async (event) => {
    event.preventDefault(); setLoading(true); setError("");
    try {
      const data = await auth.login(formData.email, formData.password);
      const target = location.state?.from?.pathname || data.redirectTo || "/supportops";
      navigate(target.startsWith("/supportops") ? target : "/supportops", { replace: true });
    } catch (err) { setError(err.message || "Unable to sign in."); }
    finally { setLoading(false); }
  };

  return <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10 text-white">
    <form onSubmit={handleLogin} className="w-full max-w-md space-y-5 rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
      <div><p className="text-sm font-semibold text-cyan-400">Nexus identity</p><h1 className="mt-2 text-2xl font-bold">Sign in to SupportOps</h1><p className="mt-2 text-sm text-slate-400">Use your existing Nexus Core account.</p></div>
      {error && <div role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}
      <label className="block text-sm text-slate-300">Email<input className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-3 text-white" type="email" name="email" autoComplete="username" required value={formData.email} onChange={handleChange} /></label>
      <label className="block text-sm text-slate-300">Password<input className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-3 text-white" type="password" name="password" autoComplete="current-password" required value={formData.password} onChange={handleChange} /></label>
      <button disabled={loading} className="w-full rounded-lg bg-cyan-600 px-4 py-3 font-semibold text-white hover:bg-cyan-500 disabled:opacity-60">{loading ? "Signing in…" : "Sign in"}</button>
      <p className="text-center text-sm text-slate-400">New workspace? <a className="text-cyan-400 hover:underline" href="/supportops/onboarding">Start setup</a></p>
    </form>
  </main>;
}
