// src/components/Login.jsx
import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useToast } from "./ToastContext.jsx";
import { useAuth } from "../hooks/useAuth";
import { safeNext } from "../auth/safeNext";

// Social sign-in is hidden until the backend routes exist. Set VITE_OAUTH_ENABLED=true to show it.
const OAUTH_ENABLED = import.meta.env.VITE_OAUTH_ENABLED === "true";

// Only these server codes are shown to the user. Anything else gets a generic message, so the form
// never reveals whether an email exists or leaks backend error text.
const KNOWN_ERRORS = {
  AUTH_MISSING_FIELDS: "Please enter both your email and access key.",
  AUTH_RATE_LIMITED: "Too many attempts. Please wait a few minutes and try again.",
};

// Never send people back to the homepage or to the login page itself
const usable = (path) => (path && path !== "/" && !path.startsWith("/login") ? path : "");

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { addToast } = useToast();
  const auth = useAuth();
  const { login } = auth;
  const location = useLocation();
  const navigate = useNavigate();

  // Where the user was heading before being asked to sign in.
  // ProtectedRoute sends ?next=<path>. location.state.from is still honoured for older links.
  const params = new URLSearchParams(location.search);
  const intended = usable(
    safeNext(params.get("next"), "") ||
    (typeof location.state?.from === "string" ? safeNext(location.state.from, "") : "")
  );
  const nextQuery = intended ? `?next=${encodeURIComponent(intended)}` : "";

  // Already signed in? Skip the form.
  const checking = Boolean(auth.initializing ?? auth.loading);
  const signedIn = Boolean(auth.isAuthenticated ?? auth.isAuth ?? auth.user);
  useEffect(() => {
    if (!checking && signedIn && !loading) navigate(intended || "/dashboard", { replace: true });
  }, [checking, signedIn, loading, intended, navigate]);

  // Pre-fill email from localStorage if returning user
  useEffect(() => {
    const savedEmail = localStorage.getItem("last_login_email");
    if (savedEmail) setEmail(savedEmail);
  }, []);

  const handleSocialAuth = (provider) => {
    addToast(`Authenticating with ${provider}...`, "info");
    const backendUrl = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://localhost:8000" : "");
    window.location.href = `${backendUrl}/api/auth/oauth/${provider}`;
  };

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);

    try {
      const cleanEmail = email.trim();
      const res = await login({ email: cleanEmail, password });

      localStorage.setItem("last_login_email", cleanEmail);
      addToast("Welcome back to Nexus Core 👋", "success");

      // 1) where the user was going, 2) the server's role-based landing page, 3) the dashboard
      const target = intended || usable(safeNext(res?.redirectTo, "")) || "/dashboard";
      navigate(target, { replace: true });
    } catch (err) {
      console.error("Login failed:", err?.message);
      const message =
        KNOWN_ERRORS[err?.message] ||
        (err instanceof TypeError
          ? "Could not reach the server. Check your connection and try again."
          : "We could not sign you in. Check your email and access key and try again.");
      addToast(message, "error");
    } finally {
      setLoading(false);
    }
  }

  // Development convenience only. The production build removes this code, so no credentials ship to browsers.
  // The literals sit inside a constant-false branch in production, so the bundler removes them entirely.
  const fillDemoCredentials = import.meta.env.DEV
    ? () => {
      setEmail("developer@nexus.ai");
      setPassword("Password123!");
      addToast("Demo credentials loaded ✨", "info");
    }
    : null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#020617] relative overflow-hidden px-4 py-12">
      {/* Background Ambient Glows */}
      <div className="absolute top-1/3 -right-20 w-80 h-80 bg-blue-600/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/3 -left-20 w-80 h-80 bg-indigo-600/20 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Branding Header */}
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

        {/* Form Card */}
        <div className="bg-slate-900/60 backdrop-blur-2xl rounded-3xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] p-8 space-y-5 border border-slate-800/50">
          <div className="flex justify-between items-center">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold text-white tracking-tight">System Login</h1>
              <p className="text-sm text-slate-400">
                {intended ? "Sign in to continue where you left off." : "Authenticate to access your workspace."}
              </p>
            </div>
            {import.meta.env.DEV && (
              <button
                type="button"
                onClick={fillDemoCredentials}
                className="text-[10px] font-bold bg-slate-800/80 hover:bg-slate-700 text-blue-400 px-2.5 py-1.5 rounded-lg border border-slate-700 transition-colors uppercase tracking-wider"
                title="Development only: load test credentials"
              >
                Demo Fill
              </button>
            )}
          </div>

          {/* SOCIAL SSO (hidden until the backend routes are implemented) */}
          {OAUTH_ENABLED && (
            <>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => handleSocialAuth("google")}
                  className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-white text-xs font-semibold transition-all shadow-sm"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z" />
                    <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z" />
                    <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 10.8 0 12.5s.7 2.8 1.9 5.2l3.7-2.9z" />
                    <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z" />
                  </svg>
                  Google
                </button>

                <button
                  type="button"
                  onClick={() => handleSocialAuth("github")}
                  className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-white text-xs font-semibold transition-all shadow-sm"
                >
                  <svg className="w-4 h-4 fill-current text-white" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                  </svg>
                  GitHub
                </button>
              </div>

              <div className="relative flex items-center justify-center my-2">
                <div className="border-t border-slate-800 w-full" />
                <span className="bg-[#0b1329] px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest absolute">
                  or email
                </span>
              </div>
            </>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* EMAIL FIELD */}
            <div className="group space-y-1">
              <label
                htmlFor="login-email"
                className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 group-focus-within:text-blue-400 transition-colors"
              >
                Authorized Email
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950/50 border border-slate-800/80 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all placeholder:text-slate-700 text-sm"
                required
              />
            </div>

            {/* PASSWORD FIELD */}
            <div className="group space-y-1">
              <div className="flex justify-between items-center px-1">
                <label
                  htmlFor="login-password"
                  className="text-[10px] font-bold text-slate-500 uppercase tracking-widest group-focus-within:text-indigo-400 transition-colors"
                >
                  Access Key
                </label>
                <Link
                  to={`/forgot-password${nextQuery}`}
                  className="text-[10px] font-bold text-blue-500 hover:text-blue-400 uppercase tracking-tighter transition-colors"
                >
                  Reset Key?
                </Link>
              </div>
              <div className="relative flex items-center">
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950/50 border border-slate-800/80 text-white px-4 py-3 pr-12 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all placeholder:text-slate-700 text-sm"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide access key" : "Show access key"}
                  className="absolute right-3 p-1.5 rounded-lg text-slate-400 hover:text-blue-400 focus:outline-none focus:text-blue-400 transition-colors z-20"
                >
                  {showPassword ? (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858-5.908A9.954 9.954 0 0112 3c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21M3 3l18 18" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full relative overflow-hidden group bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-3.5 rounded-xl font-bold transition-all shadow-lg shadow-blue-900/20 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed mt-2"
            >
              <span className="relative z-10 flex items-center justify-center gap-2 tracking-wide uppercase text-xs">
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" aria-hidden="true">
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
          </form>

          {/* User Journey Navigation Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between text-xs font-medium text-slate-400 gap-2 border-t border-slate-800/60 mt-4 pt-4">
            <Link to="/pricing" className="hover:text-blue-400 transition-colors uppercase tracking-widest text-[10px]">
              Explore Plans
            </Link>
            <Link
              to={`/register${nextQuery}`}
              className="text-blue-500 hover:text-blue-400 font-semibold uppercase tracking-widest text-[10px]"
            >
              Request Access →
            </Link>
          </div>
        </div>

        <p className="text-center mt-6 text-[9px] text-slate-700 uppercase tracking-widest">
          Secure Protocol • FluxStudio Engineering
        </p>
      </div>
    </div>
  );
}