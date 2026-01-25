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

  // Load current subscription status
  async function loadSubscription() {
    try {
      const data = await apiFetch("/auth/subscription");
      setSub(data);
    } catch {
      addToast("Failed to load subscription", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSubscription();
  }, []);

  // Detect success redirect from Stripe
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const sessionId = params.get("session_id");
    if (sessionId) {
      // User returned from Stripe checkout success
      addToast("Subscription upgraded successfully!", "success");
      loadSubscription(); // refresh subscription state
      navigate("/subscription", { replace: true }); // clean URL
    }
  }, [location]);

  // Handle upgrade flow
  async function handleUpgrade(tier) {
    try {
      const res = await apiFetch("/auth/stripe/checkout", {
        method: "POST",
        body: JSON.stringify({ tier }), // "pro" or "enterprise"
      });

      if (!res.sessionId) {
        throw new Error("No checkout session returned");
      }

      const stripe = await window.Stripe(process.env.REACT_APP_STRIPE_PUBLIC_KEY);
      await stripe.redirectToCheckout({ sessionId: res.sessionId });
    } catch (err) {
      addToast(err.message || "Stripe checkout failed", "error");
    }
  }

  if (loading) return <div className="p-6">Loading subscription…</div>;

  return (
    <div className="max-w-lg mx-auto mt-12 p-6 bg-white dark:bg-gray-900 rounded shadow">
      <h2 className="text-xl font-bold mb-2">Subscription</h2>

      {sub && sub.subscription ? (
        <div>
          <div className="mb-2">
            Current Plan: <b>{sub.subscription}</b>
          </div>
          <div>Status: {sub.status || "active"}</div>
          <div>
            Renews:{" "}
            {sub.current_period_end
              ? new Date(sub.current_period_end).toLocaleString()
              : "-"}
          </div>
        </div>
      ) : (
        <div>No active subscription.</div>
      )}

      <div className="mt-4">
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded mr-2"
          onClick={() => handleUpgrade("pro")}
        >
          Upgrade to Pro
        </button>
        <button
          className="bg-purple-600 text-white px-4 py-2 rounded"
          onClick={() => handleUpgrade("enterprise")}
        >
          Upgrade to Enterprise
        </button>
      </div>
    </div>
  );
}