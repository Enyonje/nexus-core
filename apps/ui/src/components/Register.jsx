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

      // Trigger AuthProvider state update
      login({
        user: res.user,
        token: res.token,
      });

      addToast("Welcome to Nexus Core! 🎉", "success");

      // Dynamic default path based on workspace intent
      let targetPath = intent === "explore_agents" ? "/agents" : "/nexus";

      // Respect explicit redirect directives
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
      {/* Background Glows */}
      <div className="absolute top-1/4 -left-10 w-72 h-72 bg-blue-600/20 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 -right-10 w-72 h-72 bg-purple-600/20 blur-[100px] rounded-full pointer-events-none" />

      <div className="relative z-10 w-full max-w-md animate-in fade-in zoom-in duration-500">
        {/* Branding */}
        <div className="text-center mb-6">
          <div className="text-4xl font-black tracking-tighter bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
            NEXUS CORE
          </div>
          <div className="h-1 w-12 bg-blue-500 mx-auto mt-2 rounded-full shadow-[0_0_10px_#3b82f6]" />
        </div>

        {/* The Form */}
        <form
          onSubmit={handleRegister}
          className="bg-slate-900/60 backdrop-blur-2xl rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-8 space-y-5 border border-slate-800/50"
        >
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-white tracking-tight">Join the Workforce</h2>
            <p className="text-sm text-slate-400">Select your entry goal to configure your workspace.</p>
          </div>

          {/* Intent Switcher: Launch Swarm vs Explore Agents */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
              Primary Objective
            </label>
            <div className="grid grid-cols-2 gap-2 bg-slate-950/70 p-1.5 rounded-2xl border border-slate-800/60">
              <button
                type="button"
                onClick={() => setIntent("launch_swarm")}
                className={`py-2.5 px-3 rounded-xl text-xs font-semibold transition-all flex flex-col items-center justify-center gap-1 ${intent === "launch_swarm"
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-900/40"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/50"
                  }`}
              >
                <span>Launch Swarm</span>
                <span className="text-[9px] opacity-75 font-normal">Orchestrate Fleet</span>
              </button>

              <button
                type="button"
                onClick={() => setIntent("explore_agents")}
                className={`py-2.5 px-3 rounded-xl text-xs font-semibold transition-all flex flex-col items-center justify-center gap-1 ${intent === "explore_agents"
                  ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-900/40"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/50"
                  }`}
              >
                <span>Explore Agents</span>
                <span className="text-[9px] opacity-75 font-normal">Browse Directory</span>
              </button>
            </div>
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
            className={`w-full relative overflow-hidden group py-3.5 rounded-xl font-bold transition-all shadow-lg active:scale-95 disabled:opacity-70 text-white ${intent === "explore_agents"
              ? "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-purple-900/30"
              : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-900/30"
              }`}
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Initializing Workspace...
                </>
              ) : intent === "explore_agents" ? (
                "Continue to Agent Directory"
              ) : (
                "Launch Swarm Environment"
              )}
            </span>
          </button>

          <div className="text-center">
            <Link
              to="/login"
              state={{ from: location.state?.from }}
              className="text-xs font-semibold text-slate-500 hover:text-blue-400 transition-colors uppercase tracking-widest"
            >
              Already Registered? <span className="text-blue-500">Sign In</span>
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