import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useToast } from "./ToastContext.jsx";
import { useAuth } from "../hooks/useAuth";

function safeNexusDestination(value) {
  if (typeof value !== "string" || !value.startsWith("/")) return "";
  if (value.startsWith("//")) return "";
  const path = value.split(/[?#]/, 1)[0];
  if (["/", "/login", "/register", "/supportops", "/crossborder", "/compliance"].some((blocked) => path === blocked || path.startsWith(`${blocked}/`))) return "";
  return value;
}

function BrandMark() {
  return (
    <Link to="/" className="inline-flex items-center gap-3" aria-label="Nexus Core home">
      <span className="grid h-10 w-10 place-items-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-200 shadow-[0_0_30px_rgba(34,211,238,.12)]">
        <svg viewBox="0 0 32 32" className="h-6 w-6" fill="none" aria-hidden="true"><path d="M7 24V8l18 16V8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /><circle cx="7" cy="8" r="2" fill="currentColor" /><circle cx="25" cy="24" r="2" fill="currentColor" /></svg>
      </span>
      <span className="text-left leading-none"><span className="block text-lg font-black tracking-[.16em] text-white">NEXUS<span className="text-cyan-300"> CORE</span></span><span className="mt-1 block text-[9px] font-semibold tracking-[.28em] text-slate-500">INTELLIGENCE PLATFORM</span></span>
    </Link>
  );
}

function EyeIcon({ visible }) {
  return visible ? <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></svg> : <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="m3 3 18 18M10.6 10.6a2 2 0 0 0 2.8 2.8" /><path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c6.4 0 10 7 10 7a16 16 0 0 1-3.1 3.9M6.2 6.2C3.5 8 2 12 2 12s3.6 7 10 7c1.1 0 2.1-.2 3-.5" /></svg>;
}

export default function Register() {
  const [email, setEmail] = useState("");
  const [organization, setOrganization] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();
  const { register } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  async function handleRegister(event) {
    event.preventDefault();
    if (loading) return;
    const cleanEmail = email.trim().toLowerCase();
    const cleanOrganization = organization.trim();
    if (password.length < 10 || password.length > 128 || new TextEncoder().encode(password).length > 72) {
      addToast("Use a password between 10 and 128 characters (maximum 72 UTF-8 bytes).", "error");
      return;
    }
    setLoading(true);
    try {
      // Registration returns a full session. (Before, the page called login() without a password
      // afterwards, which threw, so every successful sign-up was reported as a failure.)
      const result = await register({ email: cleanEmail, password, organization: cleanOrganization });
      if (!result?.token || !result?.user) throw new Error(result?.message || "The server returned an incomplete registration response.");
      addToast("Your Nexus Core account is ready.", "success");

      const requested = safeNexusDestination(new URLSearchParams(location.search).get("next") || location.state?.from);
      const serverTarget = safeNexusDestination(result.redirectTo);
      navigate(requested || serverTarget || "/dashboard", { replace: true });
    } catch (error) {
      console.error("Nexus Core registration failed:", error);
      const message = error instanceof TypeError
        ? "We couldn't reach Nexus Core. Check your connection and try again."
        : (error?.message || "We couldn't create your account. Please try again.");
      addToast(message, "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-[#050914] px-4 py-8 text-white selection:bg-cyan-300/30">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_12%_20%,rgba(8,145,178,.16),transparent_35%),radial-gradient(ellipse_at_88%_82%,rgba(79,70,229,.16),transparent_38%)]" />
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-[.14] [background-image:linear-gradient(rgba(148,163,184,.12)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,.12)_1px,transparent_1px)] [background-size:48px_48px] [mask-image:linear-gradient(to_bottom,black,transparent_85%)]" />

      <div className="w-full max-w-[1040px]">
        <header className="mb-7 flex items-center justify-center sm:justify-between"><BrandMark /><span className="hidden rounded-full border border-cyan-300/20 bg-cyan-300/[.06] px-3 py-2 text-[10px] font-semibold uppercase tracking-[.18em] text-cyan-200 sm:inline-flex">Create your workspace</span></header>

        <section className="grid overflow-hidden rounded-[28px] border border-white/10 bg-[#0b1220]/90 shadow-[0_30px_100px_rgba(0,0,0,.48)] backdrop-blur-xl md:grid-cols-[.9fr_1.1fr]">
          <aside className="relative hidden flex-col justify-between overflow-hidden border-r border-white/[.07] bg-gradient-to-br from-cyan-950/50 via-[#101b31] to-indigo-950/50 p-10 md:flex">
            <div className="absolute -right-24 top-16 h-72 w-72 rounded-full border border-cyan-300/10" /><div className="absolute -right-12 top-28 h-48 w-48 rounded-full border border-cyan-300/10" />
            <div className="relative"><p className="mb-5 text-[10px] font-bold uppercase tracking-[.3em] text-cyan-300">Start with a clear view</p><h1 className="max-w-sm text-4xl font-semibold leading-[1.12] tracking-tight">Bring your ideas.<br /><span className="text-cyan-300">Build your core.</span></h1><p className="mt-5 max-w-sm text-sm leading-7 text-slate-400">Create your Nexus Core account and bring your AI tools, agents, and workflows into one intelligent workspace.</p></div>
            <div className="relative rounded-2xl border border-white/10 bg-black/10 p-5"><div className="mb-3 flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-cyan-300" /><span className="text-[10px] font-bold uppercase tracking-[.2em] text-slate-400">Your Nexus Core workspace</span></div><div className="space-y-2"><div className="h-2 w-4/5 rounded-full bg-white/10" /><div className="h-2 w-3/5 rounded-full bg-white/[.07]" /><div className="mt-4 grid grid-cols-3 gap-2"><div className="h-12 rounded-lg border border-cyan-300/10 bg-cyan-300/[.06]" /><div className="h-12 rounded-lg border border-white/[.06] bg-white/[.03]" /><div className="h-12 rounded-lg border border-indigo-300/10 bg-indigo-300/[.06]" /></div></div><p className="mt-5 text-[9px] font-semibold uppercase tracking-[.22em] text-slate-600">One account · Nexus Core</p></div>
          </aside>

          <div className="p-7 sm:p-10">
            <div className="mb-7"><p className="mb-2 text-[10px] font-bold uppercase tracking-[.25em] text-cyan-300">Get started</p><h2 className="text-3xl font-semibold tracking-tight">Create your account</h2><p className="mt-2 text-sm leading-6 text-slate-400">Set up your Nexus Core identity. You can configure your workspace after signing in.</p></div>

            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2"><label htmlFor="register-organization" className="text-xs font-semibold text-slate-300">Workspace or organization</label><input id="register-organization" type="text" autoComplete="organization" placeholder="e.g. Acme Technologies" value={organization} onChange={(event) => setOrganization(event.target.value)} maxLength={120} className="w-full rounded-xl border border-white/10 bg-[#060c18] px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-slate-600 hover:border-white/20 focus:border-cyan-400/60 focus:ring-4 focus:ring-cyan-400/10" required /></div>
              <div className="space-y-2"><label htmlFor="register-email" className="text-xs font-semibold text-slate-300">Work email</label><input id="register-email" type="email" autoComplete="email" inputMode="email" placeholder="you@company.com" value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-xl border border-white/10 bg-[#060c18] px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-slate-600 hover:border-white/20 focus:border-cyan-400/60 focus:ring-4 focus:ring-cyan-400/10" required /></div>
              <div className="space-y-2"><div className="flex items-center justify-between gap-3"><label htmlFor="register-password" className="text-xs font-semibold text-slate-300">Create password</label><span className="text-[10px] text-slate-500">10+ characters</span></div><div className="relative"><input id="register-password" type={showPassword ? "text" : "password"} autoComplete="new-password" placeholder="Create a strong password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={10} maxLength={128} className="w-full rounded-xl border border-white/10 bg-[#060c18] px-4 py-3.5 pr-12 text-sm text-white outline-none transition placeholder:text-slate-600 hover:border-white/20 focus:border-cyan-400/60 focus:ring-4 focus:ring-cyan-400/10" required /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-500 transition hover:bg-white/5 hover:text-cyan-200"><EyeIcon visible={showPassword} /></button></div><p className="text-[10px] leading-5 text-slate-500">Use a unique password. For security, passwords are limited to 72 UTF-8 bytes.</p></div>

              <button type="submit" disabled={loading || !email.trim() || !organization.trim() || password.length < 10} className="group mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-300 px-4 py-3.5 text-sm font-bold text-[#04111b] shadow-[0_8px_30px_rgba(34,211,238,.14)] transition hover:bg-cyan-200 hover:shadow-[0_8px_36px_rgba(34,211,238,.24)] active:scale-[.99] disabled:cursor-not-allowed disabled:opacity-60">{loading ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-[#04111b]/30 border-t-[#04111b]" /> Creating account…</> : <>Create Nexus Core account <span aria-hidden="true" className="transition group-hover:translate-x-1">→</span></>}</button>
            </form>

            <p className="mt-6 text-center text-xs text-slate-500">Already have an account? <Link to="/login" state={{ from: location.state?.from }} className="font-semibold text-cyan-300 transition hover:text-cyan-200">Sign in</Link></p>
            <p className="mt-5 text-center text-[10px] leading-5 text-slate-600">Creating an account gives you access to Nexus Core only. Other products use their own access and workspace permissions.</p>
          </div>
        </section>
        <footer className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[10px] font-medium uppercase tracking-[.16em] text-slate-600"><span>© {new Date().getFullYear()} Nexus Core</span><span>Secure account creation</span><Link to="/pricing" className="transition hover:text-cyan-300">View plans</Link></footer>
      </div>
    </main>
  );
}
