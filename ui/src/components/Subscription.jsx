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
     LOAD SUBSCRIPTION (SAFE)
  ========================= */
  async function loadSubscription() {
    setLoading(true);

    try {
      const data = await apiFetch("/auth/subscription");

      // ✅ Always normalize response
      setTier(data?.tier ?? "free");
      setActive(Boolean(data?.active));
    } catch (err) {
      console.warn("Subscription load failed:", err.message);

      // ✅ NEVER crash or parse HTML
      setTier("free");
      setActive(false);

      if (err.message.toLowerCase().includes("authorization")) {
        addToast("Please log in to view subscription", "error");
        navigate("/login", { replace: true });
      } else {
        addToast("Unable to load subscription", "error");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSubscription();
  }, []);

  /* =========================
     STRIPE UPGRADE (SAFE)
  ========================= */
  async function handleUpgrade(targetTier) {
    try {
      const res = await apiFetch("/auth/stripe/checkout", {
        method: "POST",
        body: JSON.stringify({ tier: targetTier }),
      });

      if (!res?.sessionId) {
        throw new Error("Stripe session missing");
      }

      if (!window.Stripe) {
        throw new Error("Stripe not loaded");
      }

      const stripe = window.Stripe(
        import.meta.env.VITE_STRIPE_PUBLIC_KEY
      );

      await stripe.redirectToCheckout({ sessionId: res.sessionId });
    } catch (err) {
      console.error("Stripe error:", err);
      addToast(err.message || "Checkout failed", "error");
    }
  }

  /* =========================
     UI STATES
  ========================= */
  if (loading) {
    return (
      <div className="p-6 text-gray-500 dark:text-gray-400">
        Loading subscription…
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto mt-12 p-6 bg-white dark:bg-gray-900 rounded-xl shadow">
      <h2 className="text-xl font-bold mb-4">Subscription</h2>

      <div className="mb-6 space-y-1">
        <div>
          Current Plan:{" "}
          <b className="capitalize">{tier}</b>
        </div>
        <div>
          Status:{" "}
          <span
            className={
              active ? "text-green-600" : "text-gray-500"
            }
          >
            {active ? "Active" : "Inactive"}
          </span>
        </div>
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
