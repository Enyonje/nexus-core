import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useToast } from "./ToastContext.jsx";
import { useAuth } from "../hooks/useAuth";
import { safeNext } from "../auth/safeNext";

const KNOWN_ERRORS = {
  AUTH_MISSING_FIELDS: "Enter your email address and password to continue.",
  AUTH_RATE_LIMITED: "Too many attempts. Please wait a few minutes and try again.",
};

// Keep post-login navigation inside Nexus Core. In particular, never honour a
// saved SupportOps or other product URL as a Nexus Core login destination.
function nexusCorePath(value) {
  if (typeof value !== "string" || !value.startsWith("/")) return "";
  const path = safeNext(value, "");
  if (!path || path === "/" || path.startsWith("//")) return "";
  const blocked = ["/supportops", "/crossborder", "/compliance", "/login", "/register"];
  if (blocked.some((prefix) => path === prefix || path.startsWith(`${prefix}/`) || path.startsWith(`${prefix}?`))) return "";
  return path;
}

function BrandMark() {
  return (
    <Link to="/" className="inline-flex items-center gap-3 group" aria-label="Nexus Core home">
      <span className="grid h-10 w-10 place-items-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-200 shadow-[0_0_30px_rgba(34,211,238,.12)]">
        <svg viewBox="0 0 32 32" className="h-6 w-6" fill="none" aria-hidden="true">
          <path d="M7 24V8l18 16V8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="7" cy="8" r="2" fill="currentColor" /><circle cx="25" cy="24" r="2" fill="currentColor" />
        </svg>
      </span>
      <span className="text-left leading-none">
        <span className="block text-lg font-black tracking-[.16em] text-white">NEXUS<span className="text-cyan-300"> CORE</span></span>
        <span className="mt-1 block text-[9px] font-semibold tracking-[.28em] text-slate-500">INTELLIGENCE PLATFORM</span>
      </span>
    </Link>
  );
}

function EyeIcon({ visible }) {
  return visible ? (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></svg>
  ) : (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="m3 3 18 18M10.6 10.6a2 2 0 0 0 2.8 2.8" /><path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c6.4 0 10 7 10 7a16 16 0 0 1-3.1 3.9M6.2 6.2C3.5 8 2 12 2 12s3.6 7 10 7c1.1 0 2.1-.2 3-.5" /></svg>
  );
}

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

  const params = new URLSearchParams(location.search);
  const intended = nexusCorePath(
    safeNext(params.get("next"), "") ||
    (typeof location.state?.from === "string" ? safeNext(location.state.from, "") : "")
  );
  const nextQuery = intended ? `?next=${encodeURIComponent(intended)}` : "";
  const checking = Boolean(auth.initializing ?? auth.loading);
  const signedIn = Boolean(auth.isAuthenticated ?? auth.isAuth ?? auth.user);

  useEffect(() => {
    if (!checking && signedIn && !loading) navigate(intended || "/dashboard", { replace: true });
  }, [checking, signedIn, loading, intended, navigate]);

  useEffect(() => {
    try {
      const savedEmail = localStorage.getItem("nexus_core_last_login_email");
      if (savedEmail) setEmail(savedEmail);
    } catch { /* Storage may be unavailable; manual entry still works. */ }
  }, []);

  async function handleLogin(event) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      const result = await login({ email: cleanEmail, password, intent: "nexus-core" });
      try { localStorage.setItem("nexus_core_last_login_email", cleanEmail); } catch { /* Non-fatal. */ }
      addToast("Welcome back to Nexus Core.", "success");
      const serverTarget = nexusCorePath(result?.redirectTo);
      navigate(intended || serverTarget || "/dashboard", { replace: true });
    } catch (error) {
      console.error("Nexus Core login failed:", error?.message);
      const message = KNOWN_ERRORS[error?.message] ||
        (error instanceof TypeError
          ? "We couldn't reach Nexus Core. Check your connection and try again."
          : "Sign-in failed. Check your email and password, then try again.");
      addToast(message, "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-[#050914] px-4 py-10 text-white selection:bg-cyan-300/30">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_15%_15%,rgba(8,145,178,.16),transparent_34%),radial-gradient(ellipse_at_85%_80%,rgba(79,70,229,.16),transparent_36%)]" />
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-[.14] [background-image:linear-gradient(rgba(148,163,184,.12)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,.12)_1px,transparent_1px)] [background-size:48px_48px] [mask-image:linear-gradient(to_bottom,black,transparent_85%)]" />

      <div className="w-full max-w-[1000px]">
        <header className="mb-8 flex items-center justify-center sm:justify-between">
          <BrandMark />
          <span className="hidden items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/5 px-3 py-2 text-[10px] font-semibold uppercase tracking-[.18em] text-emerald-300 sm:inline-flex">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,.8)]" /> Secure access
          </span>
        </header>

        <section className="grid overflow-hidden rounded-[28px] border border-white/10 bg-[#0b1220]/90 shadow-[0_30px_100px_rgba(0,0,0,.48)] backdrop-blur-xl md:grid-cols-[1.02fr_.98fr]">
          <aside className="relative hidden flex-col justify-between overflow-hidden border-r border-white/[.07] bg-gradient-to-br from-cyan-950/50 via-[#101b31] to-indigo-950/50 p-10 md:flex">
            <div className="absolute -right-24 top-16 h-72 w-72 rounded-full border border-cyan-300/10" />
            <div className="absolute -right-12 top-28 h-48 w-48 rounded-full border border-cyan-300/10" />
            <div className="relative">
              <p className="mb-5 text-[10px] font-bold uppercase tracking-[.3em] text-cyan-300">Your command layer</p>
              <h1 className="max-w-sm text-4xl font-semibold leading-[1.12] tracking-tight">Think clearly.<br /><span className="text-cyan-300">Build intelligently.</span></h1>
              <p className="mt-5 max-w-sm text-sm leading-7 text-slate-400">Sign in to your Nexus Core workspace and continue building with your AI tools, agents, and workflows.</p>
            </div>
            <div className="relative space-y-4">
              {["One workspace for your AI operations", "Your agents, workflows and activity", "A secure account built for Nexus Core"].map((item) => (
                <div key={item} className="flex items-center gap-3 text-xs text-slate-300"><span className="grid h-6 w-6 place-items-center rounded-lg border border-cyan-300/20 bg-cyan-300/10 text-cyan-300">✓</span>{item}</div>
              ))}
              <p className="pt-5 text-[9px] font-semibold uppercase tracking-[.22em] text-slate-600">Nexus Core · Intelligent work, connected</p>
            </div>
          </aside>

          <div className="p-7 sm:p-10">
            <div className="mb-8">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[.25em] text-cyan-300">Welcome back</p>
              <h2 className="text-3xl font-semibold tracking-tight">Sign in to Nexus Core</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">{intended ? "Sign in to continue to your requested workspace." : "Access your workspace and pick up where you left off."}</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="login-email" className="text-xs font-semibold text-slate-300">Email address</label>
                <input id="login-email" type="email" autoComplete="username" inputMode="email" placeholder="you@company.com" value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-xl border border-white/10 bg-[#060c18] px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-slate-600 hover:border-white/20 focus:border-cyan-400/60 focus:ring-4 focus:ring-cyan-400/10" required />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <label htmlFor="login-password" className="text-xs font-semibold text-slate-300">Password</label>
                  <Link to={`/forgot-password${nextQuery}`} className="text-xs font-semibold text-cyan-300 transition hover:text-cyan-200">Forgot password?</Link>
                </div>
                <div className="relative">
                  <input id="login-password" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Enter your password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-xl border border-white/10 bg-[#060c18] px-4 py-3.5 pr-12 text-sm text-white outline-none transition placeholder:text-slate-600 hover:border-white/20 focus:border-cyan-400/60 focus:ring-4 focus:ring-cyan-400/10" required />
                  <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-500 transition hover:bg-white/5 hover:text-cyan-200"><EyeIcon visible={showPassword} /></button>
                </div>
              </div>
              <button type="submit" disabled={loading || !email.trim() || !password} className="group flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-300 px-4 py-3.5 text-sm font-bold text-[#04111b] shadow-[0_8px_30px_rgba(34,211,238,.14)] transition hover:bg-cyan-200 hover:shadow-[0_8px_36px_rgba(34,211,238,.24)] active:scale-[.99] disabled:cursor-not-allowed disabled:opacity-60">
                {loading ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-[#04111b]/30 border-t-[#04111b]" /> Signing in…</> : <>Continue to workspace <span aria-hidden="true" className="transition group-hover:translate-x-1">→</span></>}
              </button>
            </form>

            <div className="my-7 flex items-center gap-3"><span className="h-px flex-1 bg-white/[.08]" /><span className="text-[10px] font-semibold uppercase tracking-[.18em] text-slate-600">New to Nexus Core?</span><span className="h-px flex-1 bg-white/[.08]" /></div>
            <Link to={`/register${nextQuery}`} className="flex w-full items-center justify-center rounded-xl border border-white/10 bg-white/[.03] px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-cyan-300/30 hover:bg-cyan-300/[.06] hover:text-cyan-100">Create your Nexus Core account</Link>
            <p className="mt-7 text-center text-[10px] leading-5 text-slate-600">By continuing, you agree to use Nexus Core in accordance with its terms and security policies.</p>
          </div>
        </section>
        <footer className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[10px] font-medium uppercase tracking-[.16em] text-slate-600"><span>© {new Date().getFullYear()} Nexus Core</span><span>Protected account access</span><Link to="/pricing" className="transition hover:text-cyan-300">Explore plans</Link></footer>
      </div>
    </main>
  );
}
