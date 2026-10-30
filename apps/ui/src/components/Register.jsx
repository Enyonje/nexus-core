// src/pages/Register.jsx
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { useToast } from "./ToastContext.jsx";
import { useAuth } from "../hooks/useAuth";

export default function Register() {
  const [intent, setIntent] = useState("launch_swarm"); // "launch_swarm" | "explore_agents"
  const [email, setEmail] = useState("");
  const [organization, setOrganization] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { addToast } = useToast();
  const { login } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Social SSO Handler (Redirects to backend OAuth route)
  const handleSocialAuth = (provider) => {
    addToast(`Connecting to ${provider}...`, "info");
    const backendUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";
    window.location.href = `${backendUrl}/api/v1/auth/oauth/${provider}?intent=${intent}`;
  };

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
          intent,
        }),
      });

      if (!res?.token || !res?.user) {
        throw new Error(res?.message || "Invalid registration response from server");
      }

      // Persist auth tokens
      localStorage.setItem("authToken", res.token);
      localStorage.setItem("token", res.token);
      localStorage.setItem("user", JSON.stringify(res.user));

      // Update AuthContext state
      login({
        user: res.user,
        token: res.token,
      });

      addToast("Welcome to Nexus Core! 🎉", "success");

      // Dynamic path resolution based on intent or location state
      let targetPath = intent === "explore_agents" ? "/agents" : "/dashboard";
      if (res.redirectTo && res.redirectTo !== "/") {
        targetPath = res.redirectTo;
      } else if (location.state?.from && location.state.from !== "/") {
        targetPath = location.state.from;
      }

      navigate(targetPath, { replace: true });
    } catch (err) {
      console.error("Register error:", err);
      addToast(err.message || "Registration failed. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#020617] relative overflow-hidden px-4 py-8">
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 -left-10 w-72 h-72 bg-blue-600/20 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 -right-10 w-72 h-72 bg-purple-600/20 blur-[100px] rounded-full pointer-events-none" />

      <div className="relative z-10 w-full max-w-md animate-in fade-in zoom-in duration-500">
        {/* Branding Header */}
        <div className="text-center mb-6">
          <Link to="/" className="inline-block group">
            <div className="text-4xl font-black tracking-tighter bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent group-hover:opacity-90 transition-opacity">
              NEXUS CORE
            </div>
          </Link>
          <div className="h-1 w-12 bg-blue-500 mx-auto mt-2 rounded-full shadow-[0_0_10px_#3b82f6]" />
        </div>

        {/* Form Container */}
        <div className="bg-slate-900/60 backdrop-blur-2xl rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-8 space-y-5 border border-slate-800/50">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-white tracking-tight">Create Your Account</h2>
            <p className="text-sm text-slate-400">Get started in seconds with instant single sign-on.</p>
          </div>

          {/* 1-CLICK SOCIAL SSO BUTTONS */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={() => handleSocialAuth("google")}
              className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-white text-xs font-semibold transition-all shadow-sm"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z"
                />
                <path
                  fill="#4285F4"
                  d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 10.8 0 12.5s.7 2.8 1.9 5.2l3.7-2.9z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z"
                />
              </svg>
              Google
            </button>

            <button
              type="button"
              onClick={() => handleSocialAuth("github")}
              className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-white text-xs font-semibold transition-all shadow-sm"
            >
              <svg className="w-4 h-4 fill-current text-white" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              GitHub
            </button>
          </div>

          {/* DIVIDER */}
          <div className="relative flex items-center justify-center my-2">
            <div className="border-t border-slate-800 w-full" />
            <span className="bg-[#0b1329] px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest absolute">
              or email
            </span>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            {/* INTENT SWITCHER */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                Workspace Objective
              </label>
              <div className="grid grid-cols-2 gap-2 bg-slate-950/70 p-1.5 rounded-2xl border border-slate-800/60">
                <button
                  type="button"
                  onClick={() => setIntent("launch_swarm")}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all flex flex-col items-center justify-center gap-0.5 ${intent === "launch_swarm"
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-900/40"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/50"
                    }`}
                >
                  <span>Launch Swarm</span>
                  <span className="text-[9px] opacity-75 font-normal">To Dashboard</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIntent("explore_agents")}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all flex flex-col items-center justify-center gap-0.5 ${intent === "explore_agents"
                    ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-900/40"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/50"
                    }`}
                >
                  <span>Explore Agents</span>
                  <span className="text-[9px] opacity-75 font-normal">Browse Directory</span>
                </button>
              </div>
            </div>

            {/* ORGANIZATION FIELD */}
            <div className="group space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 group-focus-within:text-blue-400 transition-colors">
                Organization
              </label>
              <input
                type="text"
                placeholder="e.g. Nexus Tech"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                className="w-full bg-slate-950/50 border border-slate-800/80 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all placeholder:text-slate-700 text-sm"
                required
              />
            </div>

            {/* EMAIL FIELD */}
            <div className="group space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 group-focus-within:text-indigo-400 transition-colors">
                Work Email
              </label>
              <input
                type="email"
                placeholder="developer@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950/50 border border-slate-800/80 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition-all placeholder:text-slate-700 text-sm"
                required
              />
            </div>

            {/* PASSWORD FIELD */}
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
                  className="w-full bg-slate-950/50 border border-slate-800/80 text-white px-4 py-3 pr-12 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all placeholder:text-slate-700 text-sm"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-blue-400 transition-colors z-20"
                >
                  {showPassword ? (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858-5.908A9.954 9.954 0 0112 3c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21M3 3l18 18" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* SUBMIT BUTTON */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full relative overflow-hidden group py-3.5 rounded-xl font-bold transition-all shadow-lg active:scale-95 disabled:opacity-70 text-white mt-2 ${intent === "explore_agents"
                ? "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-purple-900/30"
                : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-900/30"
                }`}
            >
              <span className="relative z-10 flex items-center justify-center gap-2 text-xs uppercase tracking-wider">
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Initializing Account...
                  </>
                ) : intent === "explore_agents" ? (
                  "Continue to Agent Directory"
                ) : (
                  "Launch Swarm Workspace"
                )}
              </span>
            </button>
          </form>

          <div className="text-center pt-2">
            <Link
              to="/login"
              state={{ from: location.state?.from }}
              className="text-xs font-semibold text-slate-500 hover:text-blue-400 transition-colors uppercase tracking-widest"
            >
              Already Registered? <span className="text-blue-500">Sign In</span>
            </Link>
          </div>
        </div>

        <p className="text-center mt-6 text-[10px] text-slate-600 uppercase tracking-widest">
          Secure Agentic Protocol v1.02 • <span className="text-slate-500">Flux Studios Edition</span>
        </p>
      </div>
    </div>
  );
}