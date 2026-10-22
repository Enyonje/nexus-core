import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "../lib/api";
import { useToast } from "./ToastContext.jsx";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function Subscription() {
  const [tier, setTier] = useState("free");
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const { addToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isGuest, refreshSession } = useAuth();

  const loadSubscription = useCallback(async () => {
    setLoading(true);
    try {
      // Gracefully fetch subscription without throwing on 401/403
      const data = await apiFetch("/auth/subscription").catch(() => null);

      if (data) {
        setTier(data?.tier ?? "free");
        setActive(Boolean(data?.active ?? true));
      } else {
        // Guest or unauthenticated user baseline
        setTier("free");
        setActive(false);
      }
    } catch (err) {
      console.warn("Guest subscription view - defaulting to free tier:", err?.message);
      setTier("free");
      setActive(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSubscription();
  }, [loadSubscription]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const sessionId = params.get("session_id");
    const success = params.get("success");

    if (sessionId || success) {
      addToast("Payment successful! Updating subscription clearance…", "success");
      loadSubscription();
      if (typeof refreshSession === "function") {
        refreshSession();
      }
      // Clean up query params from URL after processing
      navigate(location.pathname, { replace: true });
    }

    if (params.get("canceled")) {
      addToast("Checkout canceled", "error");
      navigate(location.pathname, { replace: true });
    }
  }, [location.search, location.pathname, addToast, loadSubscription, refreshSession, navigate]);

  async function handleUpgrade(targetTier) {
    // If the user is a guest or unauthenticated, direct them to register with the selected plan context
    const token = localStorage.getItem("token") || localStorage.getItem("authToken");
    if (isGuest || !user || !token || user.isGuest) {
      addToast(`Please enter your details to select the ${targetTier.toUpperCase()} package.`, "info");
      navigate("/register", {
        state: {
          from: location.pathname,
          selectedTier: targetTier,
        },
      });
      return;
    }

    setCheckoutLoading(true);
    try {
      const res = await apiFetch("/payments/create-checkout-session", {
        method: "POST",
        body: JSON.stringify({ tier: targetTier }),
      });

      if (!res) throw new Error("No response from payment server");
      if (res.error) throw new Error(res.error);
      if (!res.url) throw new Error("Stripe checkout URL missing");

      // Redirect to Stripe Checkout session
      window.location.href = res.url;
    } catch (err) {
      const msg = err?.message ?? "Checkout initialization failed";
      console.error("[Stripe Error]:", err);
      addToast(msg, "error");
      setCheckoutLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-[#020617] text-cyan-400 font-mono text-xs uppercase tracking-widest">
        Loading Subscription Matrix…
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto my-12 p-8 bg-slate-900/80 border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-md text-slate-100 font-sans">
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">Clearance Tier</h2>
          <p className="text-xs text-slate-400 font-medium">Select a package to upgrade your execution limit and telemetry stream access.</p>
        </div>
        <span className="text-[10px] font-mono font-bold uppercase tracking-widest px-3 py-1 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
          {isGuest ? "Guest Mode" : "Authenticated"}
        </span>
      </div>

      <div className="mb-8 p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2 font-mono text-xs">
        <div className="flex justify-between">
          <span className="text-slate-500 uppercase">Current Tier:</span>
          <b className="capitalize text-cyan-400">{isGuest ? "Free (Guest)" : tier}</b>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500 uppercase">Subscription Status:</span>
          <span className={active ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>
            {active ? "ACTIVE" : "INACTIVE (FREE TIER)"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold text-xs uppercase tracking-wider py-3.5 px-4 rounded-xl transition-all shadow-lg shadow-blue-900/30 active:scale-95 disabled:cursor-not-allowed"
          disabled={tier === "pro" || checkoutLoading}
          onClick={() => handleUpgrade("pro")}
        >
          {checkoutLoading ? "Processing…" : tier === "pro" ? "Pro Active" : "Upgrade to Pro ($49/mo)"}
        </button>

        <button
          className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold text-xs uppercase tracking-wider py-3.5 px-4 rounded-xl transition-all shadow-lg shadow-purple-900/30 active:scale-95 disabled:cursor-not-allowed"
          disabled={tier === "enterprise" || checkoutLoading}
          onClick={() => handleUpgrade("enterprise")}
        >
          {checkoutLoading ? "Processing…" : tier === "enterprise" ? "Enterprise Active" : "Upgrade Enterprise ($199/mo)"}
        </button>
      </div>
    </div>
  );
}