import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { CreditCard, Loader2 } from "lucide-react";
import { PRODUCTS } from "../../auth/products";

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
    : "—";

/** Signed-in billing overview for one product: current plan, renewal, direct checkout, Stripe portal. */
export default function BillingPage({ product: slug = "billing", useProductAuth }) {
  const product = PRODUCTS[slug];
  const auth = useProductAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const [sub, setSub] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const justPaid = params.get("checkout") === "success";
  const selectedPlan = params.get("plan");
  const selectedInterval = params.get("interval") === "annual" ? "annual" : "monthly";

  const load = useCallback(async () => {
    try {
      setSub(await auth.api(`/${slug}/subscription`));
      setError("");
    } catch (err) {
      setError(err.message || "Could not load your plan.");
    }
  }, [auth, slug]);

  useEffect(() => {
    load();
  }, [load]);

  // Stripe's webhook can land a moment after the redirect; poll briefly after a successful checkout.
  useEffect(() => {
    if (!justPaid) return undefined;
    let tries = 0;
    const timer = setInterval(async () => {
      tries += 1;
      await load();
      await auth.refreshSession();
      if (tries >= 5) {
        clearInterval(timer);
        navigate(location.pathname, { replace: true });
      }
    }, 2000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [justPaid]);

  async function startCheckout(planKey, interval) {
    setBusy(true);
    setError("");
    try {
      const res = await auth.api(`/${slug}/checkout`, {
        method: "POST",
        body: { plan: planKey, interval },
      });
      if (!res?.url) throw new Error("Checkout did not return a payment link.");
      window.location.assign(res.url);
    } catch (err) {
      setError(err.message || "Could not open Stripe checkout.");
      setBusy(false);
    }
  }

  async function openPortal() {
    setBusy(true);
    setError("");
    try {
      const res = await auth.api(`/${slug}/portal`, { method: "POST" });
      window.location.assign(res.url);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-14 text-white">
      <p className="text-[11px] font-bold uppercase tracking-[.3em] text-cyan-300">
        {product.name}
      </p>
      <h1 className="mt-2 text-3xl font-black tracking-tight">Billing</h1>

      {justPaid && (
        <p className="mt-6 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-200">
          Payment received — your plan is being activated.
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="mt-6 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200"
        >
          {error}
        </p>
      )}

      {selectedPlan && !sub?.active && (
        <section className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-cyan-400/30 bg-cyan-950/30 p-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-cyan-300">
              Selected plan ready
            </p>
            <p className="mt-1 text-sm text-slate-200">
              Complete checkout for <strong className="capitalize">{selectedPlan}</strong> (
              {selectedInterval === "annual" ? "yearly" : "monthly"} billing).
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => startCheckout(selectedPlan, selectedInterval)}
            className="rounded-xl bg-cyan-300 px-5 py-2.5 text-sm font-bold text-slate-950 hover:bg-cyan-200 disabled:opacity-60"
          >
            {busy ? "Opening…" : "Complete payment"}
          </button>
        </section>
      )}

      <section className="mt-8 rounded-3xl border border-white/10 bg-slate-900/60 p-7">
        {!sub ? (
          <div className="flex items-center text-sm text-slate-400" role="status">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading your plan…
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-500">
                  Current plan
                </p>
                <p className="mt-1 text-2xl font-bold capitalize" data-testid="current-plan">
                  {sub.plan}
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  {sub.active
                    ? sub.cancel_at_period_end
                      ? `Ends on ${fmtDate(sub.current_period_end)}`
                      : `Renews on ${fmtDate(sub.current_period_end)}`
                    : "No paid subscription"}
                  {sub.interval
                    ? ` · billed ${sub.interval === "annual" ? "yearly" : "monthly"}`
                    : ""}
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${sub.active
                  ? "bg-emerald-400/15 text-emerald-300"
                  : sub.status === "past_due"
                    ? "bg-amber-400/15 text-amber-300"
                    : "bg-white/5 text-slate-400"
                  }`}
              >
                {sub.status === "inactive" ? "Free" : sub.status.replace("_", " ")}
              </span>
            </div>

            {sub.status === "past_due" && (
              <p className="mt-5 rounded-xl bg-amber-400/10 p-3 text-sm text-amber-200">
                Your last payment failed. Update your card to keep access.
              </p>
            )}

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                to={product.paths.pricing}
                className="rounded-xl bg-cyan-300 px-5 py-2.5 text-sm font-bold text-slate-950 hover:bg-cyan-200"
              >
                {sub.active ? "Change plan" : "Select a plan"}
              </Link>
              {sub.active && (
                <button
                  type="button"
                  onClick={openPortal}
                  disabled={busy}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-5 py-2.5 text-sm font-semibold hover:bg-white/5 disabled:opacity-60"
                >
                  <CreditCard className="h-4 w-4" />{" "}
                  {busy ? "Opening…" : "Invoices, card & cancellation"}
                </button>
              )}
            </div>
          </>
        )}
      </section>

      <p className="mt-6 text-xs text-slate-500">
        Signed in to {product.name} as {auth.user?.email}. Plans are per product — a{" "}
        {product.name} plan does not change your other Nexus products.
      </p>
    </main>
  );
}