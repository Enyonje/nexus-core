// src/pages/Login.jsx
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useToast } from "./ToastContext.jsx";
import { useAuth } from "../hooks/useAuth";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { addToast } = useToast();
  const { login } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const from = location.state?.from && location.state.from !== "/" ? location.state.from : "/nexus";

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await login({
        email: email.trim(),
        password: password,
      });

      addToast("Welcome back to Nexus Core 👋", "success");

      let targetPath = "/nexus";
      if (res?.redirectTo && res.redirectTo !== "/") {
        targetPath = res.redirectTo;
      } else if (from && from !== "/") {
        targetPath = from;
      }

      navigate(targetPath, { replace: true });
    } catch (err) {
      console.error("Login error:", err);
      let errMsg = err.message || "Login failed";
      if (errMsg === "AUTH_MISSING_FIELDS") {
        errMsg = "Please enter both email and access key.";
      }
      addToast(errMsg, "error");
    } finally {
      setLoading(false);
    }
  }

  // Quick Demo Auto-fill Helper for smooth evaluation & journey
  const fillDemoCredentials = () => {
    setEmail("developer@nexus.ai");
    setPassword("Password123!");
    addToast("Demo credentials loaded ✨", "info");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#020617] relative overflow-hidden px-4 py-12">
      {/* Background Ambient Glows */}
      <div className="absolute top-1/3 -right-20 w-80 h-80 bg-blue-600/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/3 -left-20 w-80 h-80 bg-indigo-600/20 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Branding */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block group">
            <div className="text-4xl font-black tracking-tighter bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent group-hover:opacity-90 transition-opacity">
              NEXUS CORE
            </div>
          </Link>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em] mt-2">
            Identity Verification Required
          </p>
        </div>

        {/* The Form - Glassmorphism Card */}
        <form
          onSubmit={handleLogin}
          className="bg-slate-900/60 backdrop-blur-2xl rounded-3xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] p-8 space-y-6 border border-slate-800/50"
        >
          <div className="flex justify-between items-center">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-white tracking-tight">System Login</h2>
              <p className="text-sm text-slate-400">Authenticate to access your worker swarms.</p>
            </div>
            {/* Quick Demo Fill Button */}
            <button
              type="button"
              onClick={fillDemoCredentials}
              className="text-[10px] font-bold bg-slate-800/80 hover:bg-slate-700 text-blue-400 px-2.5 py-1.5 rounded-lg border border-slate-700 transition-colors uppercase tracking-wider"
              title="Click to load test credentials"
            >
              Demo Fill
            </button>
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
                className="w-full bg-slate-950/50 border border-slate-800/80 text-white px-4 py-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all placeholder:text-slate-700"
                required
              />
            </div>

            {/* Password Field */}
            <div className="group space-y-1">
              <div className="flex justify-between items-center px-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest group-focus-within:text-indigo-400 transition-colors">
                  Access Key
                </label>
                <Link
                  to="/forgot-password"
                  state={{ from }}
                  className="text-[10px] font-bold text-blue-500 hover:text-blue-400 uppercase tracking-tighter transition-colors"
                >
                  Reset Key?
                </Link>
              </div>
              <div className="relative flex items-center">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950/50 border border-slate-800/80 text-white px-4 py-3.5 pr-12 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all placeholder:text-slate-700"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide access key" : "Show access key"}
                  className="absolute right-3 p-1.5 rounded-lg text-slate-400 hover:text-blue-400 focus:outline-none focus:text-blue-400 transition-colors z-20"
                >
                  {showPassword ? (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858-5.908A9.954 9.954 0 0112 3c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21M3 3l18 18" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full relative overflow-hidden group bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-4 rounded-xl font-bold transition-all shadow-lg shadow-blue-900/20 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
          >
            <span className="relative z-10 flex items-center justify-center gap-2 tracking-wide uppercase text-sm">
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Authorizing...
                </>
              ) : (
                "Enter the Core"
              )}
            </span>
          </button>

          {/* User Journey Navigation Bar */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between text-xs font-medium text-slate-400 gap-2 border-t border-slate-800/60 mt-4 pt-4">
            <Link
              to="/pricing"
              className="hover:text-blue-400 transition-colors uppercase tracking-widest text-[10px]"
            >
              Explore Plans
            </Link>
            <Link
              to="/register"
              state={{ from }}
              className="text-blue-500 hover:text-blue-400 font-semibold uppercase tracking-widest text-[10px]"
            >
              Request Access →
            </Link>
          </div>
        </form>

        {/* User Satisfaction Footer Links */}
        <div className="mt-8 flex justify-center gap-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
          <Link to="/supportops" className="hover:text-slate-300 transition-colors">SupportOps</Link>
          <span>•</span>
          <Link to="/nexus" className="hover:text-slate-300 transition-colors">Nexus Core</Link>
          <span>•</span>
          <Link to="/pricing" className="hover:text-slate-300 transition-colors">Pricing</Link>
        </div>

        <p className="text-center mt-6 text-[9px] text-slate-700 uppercase tracking-widest">
          Secure Protocol • FluxStudio Engineering
        </p>
      </div>
    </div>
  );
}