import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { useToast } from "./ToastContext.jsx";
import { useAuth } from "../context/AuthProvider";

export default function Register() {
  const [email, setEmail] = useState("");
  const [organization, setOrganization] = useState(""); // New Field
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { addToast } = useToast();
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleRegister(e) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await apiFetch("/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password, organization }),
      });

      if (!res?.token || !res?.user) {
        throw new Error("Invalid register response");
      }

      localStorage.setItem("authToken", res.token);
      localStorage.setItem("user", JSON.stringify(res.user));

      login({
        user: res.user,
        token: res.token,
      });

      addToast("Welcome to the Swarm! 🎉", "success");
      navigate("/"); 
    } catch (err) {
      console.error("Register error:", err);
      addToast(err.message || "Registration failed", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#020617] relative overflow-hidden px-4">
      
      {/* Dynamic Background Glows for "Borderless" look */}
      <div className="absolute top-1/4 -left-10 w-72 h-72 bg-blue-600/20 blur-[100px] rounded-full" />
      <div className="absolute bottom-1/4 -right-10 w-72 h-72 bg-purple-600/20 blur-[100px] rounded-full" />

      <div className="relative z-10 w-full max-w-md animate-in fade-in zoom-in duration-500">
        {/* Branding */}
        <div className="text-center mb-6">
          <div className="text-4xl font-black tracking-tighter bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
            NEXUS CORE
          </div>
          <div className="h-1 w-12 bg-blue-500 mx-auto mt-2 rounded-full shadow-[0_0_10px_#3b82f6]" />
        </div>

        {/* The Form - No Border, High Colour Depth */}
        <form
          onSubmit={handleRegister}
          className="bg-slate-900/60 backdrop-blur-2xl rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-8 space-y-5"
        >
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-white tracking-tight">Join the Workforce</h2>
            <p className="text-sm text-slate-400">Scale your operations with agentic swarms.</p>
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
                className="w-full bg-slate-950/50 border-none text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-700"
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
                placeholder="evans@nexus.ai"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950/50 border-none text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder:text-slate-700"
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
                  className="w-full bg-slate-950/50 border-none text-white px-4 py-3 pr-12 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all placeholder:text-slate-700"
                  required
                />
                {/* High Visibility Icon inside the form */}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-blue-500 hover:text-blue-300 transition-colors"
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

          <button
            type="submit"
            disabled={loading}
            className="w-full relative overflow-hidden group bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-3.5 rounded-xl font-bold transition-all shadow-lg shadow-blue-900/20 active:scale-95 disabled:opacity-70"
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Initializing...
                </>
              ) : "Create Nexus Account"}
            </span>
          </button>

          <div className="text-center">
            <Link
              to="/login"
              className="text-xs font-semibold text-slate-500 hover:text-blue-400 transition-colors uppercase tracking-widest"
            >
              Already Registered? <span className="text-blue-500">Sign In</span>
            </Link>
          </div>
        </form>

        <p className="text-center mt-8 text-[10px] text-slate-600 uppercase tracking-widest">
          Secure Agentic Protocol v1.02 • <span className="text-slate-500">Evans Nyonje Edition</span>
        </p>
      </div>
    </div>
  );
}