import { useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { useToast } from "./ToastContext.jsx";
import { useAuth } from "../context/AuthProvider";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { addToast } = useToast();
  const { login } = useAuth();

  async function handleLogin(e) {
  e.preventDefault();
  setLoading(true);

  try {
    const res = await apiFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, accessKey: password }), // <-- FIXED
    });

    if (!res?.token || !res?.user) {
      throw new Error("Invalid login response");
    }

    localStorage.setItem("authToken", res.token);
    localStorage.setItem("user", JSON.stringify(res.user));

    login({
      user: res.user,
      token: res.token,
    });

    addToast("Welcome back to the Core 👋", "success");
  } catch (err) {
    console.error("Login error:", err);
    addToast(err.message || "Login failed", "error");
  } finally {
    setLoading(false);
  }
}

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#020617] relative overflow-hidden px-4">
      
      {/* Background Ambient Glows - Matching Register Page */}
      <div className="absolute top-1/3 -right-20 w-80 h-80 bg-blue-600/20 blur-[120px] rounded-full" />
      <div className="absolute bottom-1/3 -left-20 w-80 h-80 bg-indigo-600/20 blur-[120px] rounded-full" />

      <div className="relative z-10 w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Branding */}
        <div className="text-center mb-8">
          <div className="text-4xl font-black tracking-tighter bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent inline-block">
            NEXUS CORE
          </div>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em] mt-2">
            Identity Verification Required
          </p>
        </div>

        {/* The Form - Borderless & High-End Glassmorphism */}
        <form
          onSubmit={handleLogin}
          className="bg-slate-900/60 backdrop-blur-2xl rounded-3xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] p-8 space-y-6"
        >
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-white tracking-tight">System Login</h2>
            <p className="text-sm text-slate-400">Authenticate to access your worker swarms.</p>
          </div>

          <div className="space-y-4">
            {/* Email Field */}
            <div className="group space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 group-focus-within:text-blue-400 transition-colors">
                Authorized Email
              </label>
              <input
                type="email"
                placeholder="developer@nexus.ai"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950/50 border-none text-white px-4 py-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-700"
                required
              />
            </div>

            {/* Password Field */}
            <div className="group space-y-1">
              <div className="flex justify-between items-center px-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest group-focus-within:text-indigo-400 transition-colors">
                  Access Key
                </label>
                <Link to="/forgot-password" size="sm" className="text-[10px] font-bold text-blue-500 hover:text-blue-400 uppercase tracking-tighter transition-colors">
                  Reset Key?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950/50 border-none text-white px-4 py-3.5 pr-12 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder:text-slate-700"
                  required
                />
                {/* High Visibility Password Toggle inside the input */}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
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

          <button
            type="submit"
            disabled={loading}
            className="w-full relative overflow-hidden group bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-4 rounded-xl font-bold transition-all shadow-lg shadow-blue-900/20 active:scale-95 disabled:opacity-70"
          >
            <span className="relative z-10 flex items-center justify-center gap-2 tracking-wide uppercase text-sm">
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Authorizing...
                </>
              ) : "Enter the Core"}
            </span>
          </button>

          <div className="pt-2 text-center">
            <Link
              to="/register"
              className="text-xs font-semibold text-slate-500 hover:text-blue-400 transition-colors uppercase tracking-[0.15em]"
            >
              New to Nexus? <span className="text-blue-500 underline underline-offset-4 decoration-blue-500/30">Request Access</span>
            </Link>
          </div>
        </form>

        <div className="mt-12 flex justify-center gap-6 opacity-30 grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-500">
           {/* Subtle trust icons to match design language */}
           <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center font-bold text-[8px] text-white">GCP</div>
           <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center font-bold text-[8px] text-white">VRC</div>
           <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center font-bold text-[8px] text-white">NODE</div>
        </div>

        <p className="text-center mt-8 text-[9px] text-slate-700 uppercase tracking-widest">
           Secure Protocol • Evans Nyonje Engineering
        </p>
      </div>
    </div>
  );
}