import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Loader2, ShieldCheck } from "lucide-react";
import { PRODUCTS } from "../../auth/products";
import { safeNext } from "../../auth/safeNext";

const COPY = {
  login: { title: "Sign in", cta: "Sign in", alt: ["New here?", "register", "Create an account"] },
  register: { title: "Create your account", cta: "Create account", alt: ["Already have an account?", "login", "Sign in"] },
  forgot: { title: "Reset your password", cta: "Send reset link", alt: ["Remembered it?", "login", "Back to sign in"] },
  reset: { title: "Choose a new password", cta: "Update password", alt: ["", "login", "Back to sign in"] },
};

/** Keep redirects inside this product so one product's sign-in never lands on another's pages. */
function nextInside(product, raw) {
  const path = safeNext(raw, "");
  if (!path) return "";
  if (product.basePath && !(path === product.basePath || path.startsWith(`${product.basePath}/`) || path.startsWith(`${product.basePath}?`))) return "";
  if (Object.values(product.paths).some((p) => p !== product.paths.pricing && (path === p || path.startsWith(`${p}?`)))) return "";
  return path;
}

/**
 * Sign-in / sign-up / forgot / reset screens for any product except Nexus Core (which keeps its own
 * branded screens). Talks only to that product's auth instance.
 */
export default function ProductAuthPage({ product: slug, mode, useProductAuth }) {
  const product = PRODUCTS[slug];
  const auth = useProductAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const next = nextInside(product, params.get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [organization, setOrganization] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const copy = COPY[mode];

  useEffect(() => {
    if ((mode === "login" || mode === "register") && !auth.loading && auth.isAuthenticated && !busy) navigate(next || product.homePath, { replace: true });
  }, [mode, auth.loading, auth.isAuthenticated, busy, next, navigate, product.homePath]);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setNotice("");
    setBusy(true);
    try {
      if (mode === "login") {
        await auth.login({ email, password });
        navigate(next || product.homePath, { replace: true });
      } else if (mode === "register") {
        await auth.register({ email, password, organization });
        navigate(next || product.homePath, { replace: true });
      } else if (mode === "forgot") {
        const res = await auth.forgotPassword(email);
        setNotice(res?.message || "If that email has an account, a reset link is on its way.");
      } else {
        const res = await auth.resetPassword(params.get("token") || "", password);
        setNotice(res?.message || "Password updated.");
        setTimeout(() => navigate(product.paths.login, { replace: true }), 1200);
      }
    } catch (err) {
      setError(err.data?.hint ? `${err.message} ${err.data.hint}` : err.message || "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const needsEmail = mode !== "reset";
  const needsPassword = mode !== "forgot";
  const altPath = product.paths[copy.alt[1]] + (next ? `?next=${encodeURIComponent(next)}` : "");

  return (
    <main className="flex min-h-[calc(100vh-64px)] items-start justify-center bg-[#04110f] px-4 pb-16 pt-16 text-white md:pt-24">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl border border-emerald-300/25 bg-emerald-300/10 text-emerald-200"><ShieldCheck className="h-6 w-6" /></span>
          <div>
            <p className="text-sm font-black tracking-wide">{product.name}</p>
            <p className="text-[11px] text-slate-400">{product.tagline}</p>
          </div>
        </div>
        <form onSubmit={submit} className="rounded-3xl border border-white/10 bg-slate-950/80 p-7 shadow-2xl">
          <h1 className="text-2xl font-bold">{copy.title}</h1>
          <p className="mt-1 text-xs text-slate-400">This account is for {product.name} only. Your Nexus Core sign-in is separate.</p>
          {error && <p role="alert" className="mt-5 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}
          {notice && <p role="status" className="mt-5 rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">{notice}</p>}
          <div className="mt-6 space-y-4">
            {mode === "register" && (
              <label className="block text-xs font-semibold text-slate-300">Company or brokerage
                <input value={organization} onChange={(e) => setOrganization(e.target.value)} maxLength={120} required autoComplete="organization"
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-emerald-300/60" />
              </label>
            )}
            {needsEmail && (
              <label className="block text-xs font-semibold text-slate-300">Email
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email"
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-emerald-300/60" />
              </label>
            )}
            {needsPassword && (
              <label className="block text-xs font-semibold text-slate-300">{mode === "reset" ? "New password" : "Password"}
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={mode === "login" ? 1 : 10} maxLength={128}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-emerald-300/60" />
                {mode !== "login" && <span className="mt-1 block text-[10px] font-normal text-slate-500">At least 10 characters.</span>}
              </label>
            )}
          </div>
          {mode === "login" && <Link to={product.paths.forgot} className="mt-3 inline-block text-xs text-emerald-300 hover:underline">Forgot password?</Link>}
          <button type="submit" disabled={busy} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-300 px-4 py-3 text-sm font-bold text-slate-950 hover:bg-emerald-200 disabled:opacity-60">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}{copy.cta}
          </button>
          <p className="mt-5 text-center text-xs text-slate-500">{copy.alt[0]} <Link to={altPath} className="font-semibold text-emerald-300 hover:underline">{copy.alt[2]}</Link></p>
        </form>
      </div>
    </main>
  );
}
