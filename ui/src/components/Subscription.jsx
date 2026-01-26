import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import { useToast } from "./ToastContext";
import { useNavigate, useLocation } from "react-router-dom";

export default function Subscription() {
  const [sub, setSub] = useState(null);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  async function loadSubscription() {
    try {
      const data = await apiFetch("/auth/subscription");
      setSub(data);
    } catch (err) {
      addToast(err.message || "Failed to load subscription", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSubscription();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("success")) {
      addToast("Subscription upgraded successfully!", "success");
      loadSubscription();
      navigate("/subscription", { replace: true });
    }
  }, [location]);

  async function handleUpgrade(tier) {
    try {
      const res = await apiFetch("/auth/stripe/checkout", {
        method: "POST",
        body: JSON.stringify({ tier }),
      });

      const stripe = window.Stripe(
        import.meta.env.VITE_STRIPE_PUBLIC_KEY
      );

      await stripe.redirectToCheckout({ sessionId: res.sessionId });
    } catch (err) {
      addToast(err.message || "Stripe checkout failed", "error");
    }
  }

  if (loading) return <div className="p-6">Loading subscription…</div>;

  return (
    <div className="max-w-lg mx-auto mt-12 p-6 bg-white dark:bg-gray-900 rounded shadow">
      <h2 className="text-xl font-bold mb-4">Subscription</h2>

      {sub?.active ? (
        <p>
          Current plan: <b>{sub.tier}</b>
        </p>
      ) : (
        <p>No active subscription</p>
      )}

      <div className="mt-6 space-x-3">
        <button
          onClick={() => handleUpgrade("pro")}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Upgrade to Pro
        </button>
        <button
          onClick={() => handleUpgrade("enterprise")}
          className="bg-purple-600 text-white px-4 py-2 rounded"
        >
          Upgrade to Enterprise
        </button>
      </div>
    </div>
  );
}
