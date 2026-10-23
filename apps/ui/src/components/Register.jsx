import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { useToast } from "./ToastContext.jsx";
import { useAuth } from "../hooks/useAuth";

export default function Register() {
  const [email, setEmail] = useState("");
  const [organization, setOrganization] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { addToast } = useToast();
  const { login } = useAuth();
  const location = useLocation();
  const useNavigateInstance = useNavigate();

  // Capture optional selected tier if user came from pricing/subscription page
  const selectedTier = location.state?.selectedTier || "free";

  async function handleRegister(e) {
    e.preventDefault();
    setLoading(true);

    try {
      const cleanEmail = email.trim();
      const res = await apiFetch("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email: cleanEmail,
          password: password,
          accessKey: password,
          organization: organization.trim(),
          tier: selectedTier,
        }),
      });

      if (!res?.token || !res?.user) {
        throw new Error(res?.message || "Invalid registration response from server");
      }

      // Persist auth tokens
      localStorage.setItem("authToken", res.token);
      localStorage.setItem("token", res.token);
      localStorage.setItem("user", JSON.stringify(res.user));

      // Trigger AuthProvider state update
      if (typeof login === "function") {
        await login({
          email: cleanEmail,
          password: password,
        }).catch(() => { });
      }

      addToast("Workspace created successfully! Welcome to Nexus Core 🎉", "success");

      // Default target route is always /dashboard, bypassing landing page ("/")
      let targetPath = "/dashboard";
      const rawFrom = location.state?.from;

      if (res.redirectTo && res.redirectTo !== "/") {
        targetPath = res.redirectTo;
      } else if (rawFrom && rawFrom !== "/") {
        targetPath = rawFrom;
      }

      useNavigateInstance(targetPath, { replace: true });
    } catch (err) {
      console.error("Register error:", err);
      addToast(err.message || "Registration failed. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#020617] relative overflow-hidden px-4 py-8">
      {/* Background Glows */}
      <div className="absolute top-1/4 -left-10 w-72 h-72 bg-blue-600/20 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 -right-10 w-72 h-72 bg-purple-600/20 blur-[100px] rounded-full pointer-events-none" />

      <div className="relative z-10 w-full max-w-md animate-in fade-in zoom-in duration-500">
        {/* Branding */}
        <div className="text-center mb-6">
          <Link to="/" className="inline-block group">
            <div className="text-4xl font-black tracking-tighter bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
              NEXUS CORE
            </div>
          </Link>
          <div className="h-1 w-12 bg-blue-500 mx-auto mt-2 rounded-full shadow-[0_0_10px_#3b82f6]" />
          {selectedTier !== "free" && (
            <span className="inline-block mt-3 text-[10px] font-mono font-bold uppercase tracking-widest px-3 py-1 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              Selected Package: {selectedTier.toUpperCase()}
            </span>
          )}
        </div>

        {/* The Form */}
        <form
          onSubmit={handleRegister}
          className="bg-slate-900/60 backdrop-blur-2xl rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-8 space-y-5 border border-slate-800/50"
        >
          <div className="space-y-1 text-center">
            <h2 className="text-2xl font-bold text-white tracking-tight">Create Workspace</h2>
            <p className="text-sm text-slate-400">Sign up to access your Nexus Dashboard.</p>
          </div>

          <div className="space-y-4">
            {/* Organization Field */}
            <div className="group space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 group-focus-within:text-blue-400 transition-colors">
                Organization
              </label>
              <input
                type="text"
                placeholder="e.g. Nexus Industries"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                className="w-full bg-slate-950/50 border border-slate-800/80 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all placeholder:text-slate-700"
                required
              />
            </div>

            {/* Email Field */}
            <div className="group space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 group-focus-within:text-blue-400 transition-colors">
                Work Email
              </label>
              <input
                type="email"
                placeholder="developer@nexus.ai"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950/50 border border-slate-800/80 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition-all placeholder:text-slate-700"
                required
              />
            </div>

            {/* Password Field */}
            <div className="group space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 group-focus-within:text-purple-400 transition-colors">
                Master Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950/50 border border-slate-800/80 text-white px-4 py-3 pr-12 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all placeholder:text-slate-700"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide master password" : "Show master password"}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-blue-500 hover:text-blue-300 transition-colors z-20"
                >
                  {showPassword ? (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-5.523 0-10-4.477-10-10 0-1.05.162-2.06.462-3.002m3.05-3.05A9.956 9.956 0 0112 3c5.523 0 10 4.477 10 10 0 1.05-.162 2.06-.462 3.002m-3.05 3.05A9.956 9.956 0 0112 21c-5.523 0-10-4.477-10-10" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full relative overflow-hidden group py-3.5 rounded-xl font-bold transition-all shadow-lg active:scale-95 disabled:opacity-70 text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-900/30"
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Initializing Dashboard...
                </>
              ) : (
                "Enter Dashboard"
              )}
            </span>
          </button>

          {/* Secondary Options */}
          <div className="flex flex-col gap-2 text-center pt-2">
            <Link
              to="/login"
              state={{ from: location.state?.from }}
              className="text-xs font-semibold text-slate-500 hover:text-blue-400 transition-colors uppercase tracking-widest"
            >
              Already Registered? <span className="text-blue-500">Sign In</span>
            </Link>

            <Link
              to="/agents"
              className="text-xs font-semibold text-purple-400/80 hover:text-purple-300 transition-colors"
            >
              Looking for Support? Browse Agent Directory &rarr;
            </Link>
          </div>
        </form>

        <p className="text-center mt-8 text-[10px] text-slate-600 uppercase tracking-widest">
          Secure Agentic Protocol v1.02 • <span className="text-slate-500">Flux Studios Edition</span>
        </p>
      </div>
    </div>
  );
}