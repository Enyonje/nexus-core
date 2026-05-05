import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "../lib/api";
import { useToast } from "./ToastContext.jsx";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthProvider.jsx"; // optional, if you want to sync context

export default function Subscription() {
  const [tier, setTier] = useState("free");
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const { addToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const auth = useAuth?.(); // optional: useAuth should provide a way to refresh subscription

  const loadSubscription = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch("/auth/subscription");
      // Expecting { tier: "pro"|"enterprise"|"free", active: boolean }
      setTier(data?.tier ?? "free");
      setActive(Boolean(data?.active));
    } catch (err) {
      const msg = err?.message ?? "Unable to load subscription";
      console.warn("Subscription load failed:", msg);
      setTier("free");
      setActive(false);

      if (msg.toLowerCase().includes("authorization") || msg.toLowerCase().includes("unauthorized")) {
        addToast("Please log in to view subscription", "error");
        navigate("/login", { replace: true });
      } else {
        addToast(msg, "error");
      }
    } finally {
      setLoading(false);
    }
  }, [addToast, navigate]);

  useEffect(() => {
    loadSubscription();
  }, [loadSubscription]);

  useEffect(() => {
    // Stripe typically returns ?session_id=... on success unless you add custom params.
    const params = new URLSearchParams(location.search);
    const sessionId = params.get("session_id");
    const success = params.get("success");

    if (sessionId || success) {
      addToast("Payment successful! Updating subscription…", "success");
      // Re-fetch subscription state from server
      loadSubscription();

      // Optionally, clear query params to avoid repeated toasts on refresh
      // navigate(location.pathname, { replace: true });
    }

    if (params.get("canceled")) {
      addToast("Checkout canceled", "error");
    }
  }, [location.search, addToast, loadSubscription]);

  async function handleUpgrade(targetTier) {
    setCheckoutLoading(true);
    try {
      // Ensure apiFetch sends JSON headers. If your apiFetch already sets headers, remove the headers object.
      const res = await apiFetch("/payments/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: targetTier }),
      });

      if (!res) throw new Error("No response from server");
      if (res.error) throw new Error(res.error);

      if (!res.url) throw new Error("Stripe checkout URL missing");

      // Redirect to Stripe Checkout
      window.location.href = res.url;
    } catch (err) {
      const msg = err?.message ?? "Checkout failed";
      console.error("Stripe error:", err);
      addToast(msg, "error");
      setCheckoutLoading(false);
    }
  }

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
          Current Plan: <b className="capitalize">{tier}</b>
        </div>
        <div>
          Status:{" "}
          <span className={active ? "text-green-600" : "text-gray-500"}>
            {active ? "Active" : "Inactive"}
          </span>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
          disabled={tier === "pro" || checkoutLoading}
          onClick={() => handleUpgrade("pro")}
        >
          {checkoutLoading && "Processing…"}
          {!checkoutLoading && (tier === "pro" ? "Pro Active" : "Upgrade to Pro")}
        </button>

        <button
          className="bg-purple-600 text-white px-4 py-2 rounded disabled:opacity-50"
          disabled={tier === "enterprise" || checkoutLoading}
          onClick={() => handleUpgrade("enterprise")}
        >
          {checkoutLoading && "Processing…"}
          {!checkoutLoading && (tier === "enterprise" ? "Enterprise Active" : "Upgrade to Enterprise")}
        </button>
      </div>
    </div>
  );
}
