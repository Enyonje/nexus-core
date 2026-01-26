import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import { useToast } from "./ToastContext.jsx";
import { useNavigate, useLocation } from "react-router-dom";

export default function Subscription() {
  const [sub, setSub] = useState(null);
  const [loading, setLoading] = useState(true);

  const { addToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  /* =========================
     LOAD SUBSCRIPTION
  ========================= */
  async function loadSubscription() {
    try {
      const data = await apiFetch("/auth/subscription");
      setSub(data); // { active: boolean, tier: string }
    } catch (err) {
      addToast("Failed to load subscription", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSubscription();
  }, []);

  /* =========================
     STRIPE SUCCESS REDIRECT
  ========================= */
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const sessionId = params.get("session_id");

    if (sessionId) {
      addToast("Subscription upgraded successfully 🎉", "success");
      loadSubscription();
      navigate("/subscription", { replace: true });
    }
  }, [location]);

  /* =========================
     STRIPE CHECKOUT
  ========================= */
  async function handleUpgrade(tier) {
    try {
      const res = await apiFetch("/auth/stripe/checkout", {
        method: "POST",
        body: JSON.stringify({ tier }),
      });

      if (!res.sessionId) {
        throw new Error("Checkout session not created");
      }

      const stripe = window.Stripe(
        import.meta.env.VITE_STRIPE_PUBLIC_KEY
      );

      await stripe.redirectToCheckout({
        sessionId: res.sessionId,
      });
    } catch (err) {
      addToast(err.message || "Stripe checkout failed", "error");
    }
  }

  /* =========================
     UI
  ========================= */
  if (loading) {
    return <div className="p-6">Loading subscription…</div>;
  }

  return (
    <div className="max-w-lg mx-auto mt-12 p-6 bg-white dark:bg-gray-900 rounded shadow">
      <h2 className="text-xl font-bold mb-4">Subscription</h2>

      {sub?.active ? (
        <div className="mb-4">
          <div>
            Current Plan: <b className="capitalize">{sub.tier}</b>
          </div>
          <div className="text-green-600 font-medium mt-1">
            Status: Active
          </div>
        </div>
      ) : (
        <div className="mb-4 text-gray-500">
          No active subscription (Free plan)
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={() => handleUpgrade("pro")}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        >
          Upgrade to Pro
        </button>

        <button
          onClick={() => handleUpgrade("enterprise")}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded"
        >
          Upgrade to Enterprise
        </button>
      </div>
    </div>
  );
}
