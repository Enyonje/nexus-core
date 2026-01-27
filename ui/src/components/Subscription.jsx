import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import { useToast } from "./ToastContext.jsx";
import { useNavigate } from "react-router-dom";

export default function Subscription() {
  const [tier, setTier] = useState("free");
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(true);

  const { addToast } = useToast();
  const navigate = useNavigate();

  /* =========================
     LOAD SUBSCRIPTION
  ========================= */
  async function loadSubscription() {
    try {
      const data = await apiFetch("/auth/subscription");

      setTier(data.tier || "free");
      setActive(Boolean(data.active));
    } catch (err) {
      addToast("Please login to view subscription", "error");
      navigate("/login", { replace: true });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSubscription();
  }, []);

  /* =========================
     STRIPE UPGRADE
  ========================= */
  async function handleUpgrade(tier) {
    try {
      const res = await apiFetch("/auth/stripe/checkout", {
        method: "POST",
        body: JSON.stringify({ tier }),
      });

      if (!res.sessionId) {
        throw new Error("Stripe session missing");
      }

      const stripe = window.Stripe(
        import.meta.env.VITE_STRIPE_PUBLIC_KEY
      );

      await stripe.redirectToCheckout({ sessionId: res.sessionId });
    } catch (err) {
      addToast(err.message || "Checkout failed", "error");
    }
  }

  /* =========================
     UI STATES
  ========================= */
  if (loading) {
    return <div className="p-6">Loading subscription…</div>;
  }

  return (
    <div className="max-w-lg mx-auto mt-12 p-6 bg-white dark:bg-gray-900 rounded shadow">
      <h2 className="text-xl font-bold mb-4">Subscription</h2>

      <div className="mb-4">
        <div>
          Current Plan: <b className="capitalize">{tier}</b>
        </div>
        <div>Status: {active ? "Active" : "Inactive"}</div>
      </div>

      <div className="flex gap-3">
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
          disabled={tier === "pro"}
          onClick={() => handleUpgrade("pro")}
        >
          {tier === "pro" ? "Pro Active" : "Upgrade to Pro"}
        </button>

        <button
          className="bg-purple-600 text-white px-4 py-2 rounded disabled:opacity-50"
          disabled={tier === "enterprise"}
          onClick={() => handleUpgrade("enterprise")}
        >
          {tier === "enterprise"
            ? "Enterprise Active"
            : "Upgrade to Enterprise"}
        </button>
      </div>
    </div>
  );
}
