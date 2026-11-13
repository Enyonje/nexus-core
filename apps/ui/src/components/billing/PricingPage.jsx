import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Check, Loader2 } from "lucide-react";
import { apiFetch } from "../../lib/api";
import { FALLBACK_PLANS } from "../../config/plans";
import { PRODUCTS } from "../../auth/products";

function normalizeFallback(slug) {
  return (FALLBACK_PLANS[slug] || []).map((plan) => ({
    ...plan,
    prices: Object.fromEntries(Object.entries(plan.prices).map(([k, v]) => [k, { ...v, display: `$${v.amount}`, checkout: v.amount === 0 ? "none" : "unavailable" }])),
  }));
}

/**
 * Public pricing page for one product. Works signed out; the button decides what happens:
 *   free plan          -> create an account
 *   paid, signed out   -> create an account, then come back here with the plan pre-selected
 *   paid, signed in    -> Stripe Checkout (or the billing portal if already subscribed)
 *   no online price    -> contact sales
 */
export default function PricingPage({ product: slug = "nexus-core", useProductAuth }) {
  const product = PRODUCTS[slug];
  const auth = useProductAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const [interval, setBillingInterval] = useState(params.get("interval") === "annual" ? "annual" : "monthly");
  const [plans, setPlans] = useState(null);
  const [offline, setOffline] = useState(false);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");
  const canceled = params.get("checkout") === "canceled";

  useEffect(() => {
    let alive = true;
    apiFetch(`/${slug}/billing/plans`, { product: slug, timeout: 12000 })
      .then((res) => alive && setPlans(res.plans))
      .catch(() => {
        if (!alive) return;
        setPlans(normalizeFallback(slug));
        setOffline(true);
      });
    return () => { alive = false; };
  }, [slug]);

  const currentTier = auth.tier;

  async function choose(plan) {
    setError("");
    const price = plan.prices[interval];
    if (price.checkout === "contact" || price.checkout === "unavailable") {
      navigate("/contact", { state: { from: location.pathname, plan: plan.key, product: slug } });
      return;
    }
    if (!auth.isAuthenticated) {
      const back = `${product.paths.pricing}?plan=${plan.key}&interval=${interval}`;
      navigate(`${product.paths.register}?next=${encodeURIComponent(back)}`);
      return;
    }
    if (price.checkout === "none") {
      navigate(product.homePath);
      return;
    }
    setBusy(plan.key);
    try {
      const res = await auth.api(`/${slug}/billing/checkout`, { method: "POST", body: { plan: plan.key, interval } });
      if (!res?.url) throw new Error("Checkout did not return a payment link.");
      window.location.assign(res.url);
    } catch (err) {
      setError(err.message || "Checkout could not start. Try again.");
      setBusy(null);
    }
  }

  // Coming back from sign-up with ?plan=pro continues straight to checkout.
  const preselected = params.get("plan");
  useEffect(() => {
    if (!plans || !preselected || !auth.isAuthenticated || busy) return;
    const plan = plans.find((p) => p.key === preselected);
    if (plan && plan.prices[interval].checkout === "stripe") choose(plan);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plans, preselected, auth.isAuthenticated]);

  const annualSaving = useMemo(() => {
    const pro = plans?.find((p) => p.popular) || plans?.[1];
    if (!pro) return null;
    const m = pro.prices.monthly.amount, a = pro.prices.annual.amount;
    return m > 0 ? Math.round((1 - a / m) * 100) : null;
  }, [plans]);

  return (
    <main className="min-h-screen bg-[#020617] px-6 pb-24 pt-16 text-white">
      <div className="mx-auto max-w-6xl">
        <header className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-bold uppercase tracking-[.3em] text-cyan-300">{product.name} pricing</p>
          <h1 className="mt-4 text-4xl font-black tracking-tight md:text-5xl">Plans that grow with your workload</h1>
          <p className="mt-4 text-sm text-slate-400">Start free. Upgrade when you need more. Cancel any time from your billing page.</p>
          <div className="mt-8 inline-flex rounded-xl border border-white/10 bg-slate-900/70 p-1" role="group" aria-label="Billing interval">
            {["monthly", "annual"].map((iv) => (
              <button key={iv} type="button" onClick={() => setBillingInterval(iv)} aria-pressed={interval === iv}
                className={`rounded-lg px-5 py-2 text-xs font-bold uppercase tracking-wider transition ${interval === iv ? "bg-cyan-300 text-slate-950" : "text-slate-400 hover:text-white"}`}>
                {iv === "monthly" ? "Monthly" : `Yearly${annualSaving ? ` · save ${annualSaving}%` : ""}`}
              </button>
            ))}
          </div>
        </header>

        {canceled && <p className="mx-auto mt-8 max-w-xl rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-center text-sm text-amber-200">Checkout was canceled. You have not been charged.</p>}
        {offline && <p className="mx-auto mt-8 max-w-xl rounded-xl border border-white/10 bg-slate-900 p-3 text-center text-xs text-slate-400">Live prices are unavailable right now; these are our published list prices. Online checkout will return shortly.</p>}
        {error && <p role="alert" className="mx-auto mt-8 max-w-xl rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-center text-sm text-red-200">{error}</p>}

        {!plans ? (
          <div className="mt-16 flex justify-center text-slate-400" role="status"><Loader2 className="h-5 w-5 animate-spin" /><span className="ml-3 text-sm">Loading plans…</span></div>
        ) : (
          <section className={`mt-12 grid gap-6 ${plans.length >= 4 ? "md:grid-cols-2 lg:grid-cols-4" : "md:grid-cols-3"}`}>
            {plans.map((plan) => {
              const price = plan.prices[interval];
              const isCurrent = auth.isAuthenticated && currentTier === plan.key;
              const label = isCurrent ? "Current plan"
                : price.checkout === "none" ? (auth.isAuthenticated ? "Go to workspace" : "Start free")
                : price.checkout === "stripe" ? (auth.isAuthenticated ? `Choose ${plan.name}` : `Start with ${plan.name}`)
                : "Contact sales";
              return (
                <article key={plan.key} data-plan={plan.key}
                  className={`relative flex flex-col rounded-3xl border p-7 ${plan.popular ? "border-cyan-300/50 bg-gradient-to-b from-cyan-950/40 to-slate-950 shadow-[0_0_60px_rgba(34,211,238,.12)]" : "border-white/10 bg-slate-900/50"}`}>
                  {plan.popular && <span className="absolute -top-3 left-7 rounded-full bg-cyan-300 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-950">Most popular</span>}
                  <h2 className="text-lg font-bold">{plan.name}</h2>
                  <p className="mt-1 min-h-[40px] text-xs text-slate-400">{plan.description}</p>
                  <p className="mt-6 flex items-baseline gap-1"><span className="text-4xl font-black">{price.display}</span>{price.amount > 0 && <span className="text-xs text-slate-400">/ month</span>}</p>
                  <p className="mt-1 text-[11px] text-slate-500">{price.billedAs || (price.amount > 0 ? (interval === "annual" ? `$${price.amount * 12} billed yearly` : "billed monthly") : "free forever")}</p>
                  <ul className="mt-6 flex-1 space-y-2.5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex gap-2 text-sm text-slate-300"><Check className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" aria-hidden="true" />{f}</li>
                    ))}
                  </ul>
                  <button type="button" disabled={isCurrent || busy === plan.key} onClick={() => choose(plan)}
                    className={`mt-8 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${plan.popular ? "bg-cyan-300 text-slate-950 hover:bg-cyan-200" : "border border-white/15 bg-white/5 hover:bg-white/10"}`}>
                    {busy === plan.key ? <><Loader2 className="h-4 w-4 animate-spin" /> Opening checkout…</> : label}
                  </button>
                </article>
              );
            })}
          </section>
        )}

        <p className="mt-10 text-center text-xs text-slate-500">
          Prices in USD, excluding tax. {auth.isAuthenticated ? <Link className="text-cyan-300 hover:underline" to={product.paths.billing}>Manage your billing</Link> : <>Already a customer? <Link className="text-cyan-300 hover:underline" to={`${product.paths.login}?next=${encodeURIComponent(product.paths.billing)}`}>Sign in</Link></>}
        </p>
      </div>
    </main>
  );
}
