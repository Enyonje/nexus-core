import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import { useToast } from "./ToastContext.jsx";

export default function Subscription() {
  const [sub, setSub] = useState(null);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  useEffect(() => {
    apiFetch("/auth/subscription")
      .then(setSub)
      .catch(() => addToast("Failed to load subscription", "error"))
      .finally(() => setLoading(false));
  }, []);

  async function handleUpgrade(priceId) {
    try {
      const res = await apiFetch("/auth/stripe/checkout", {
        method: "POST",
        body: JSON.stringify({ priceId }),
      });
      window.location.href = res.url;
    } catch (err) {
      addToast(err.message || "Stripe checkout failed", "error");
    }
  }

  if (loading) return <div className="p-6">Loading subscription…</div>;
  return (
    <div className="max-w-lg mx-auto mt-12 p-6 bg-white dark:bg-gray-900 rounded shadow">
      <h2 className="text-xl font-bold mb-2">Subscription</h2>
      {sub && sub.name ? (
        <div>
          <div className="mb-2">Current Plan: <b>{sub.name}</b></div>
          <div>Status: {sub.status || "active"}</div>
          <div>Renews: {sub.current_period_end ? new Date(sub.current_period_end).toLocaleString() : "-"}</div>
        </div>
      ) : (
        <div>No active subscription.</div>
      )}
      <div className="mt-4">
        <button className="bg-blue-600 text-white px-4 py-2 rounded mr-2" onClick={() => handleUpgrade("price_pro")}>Upgrade to Pro</button>
        <button className="bg-purple-600 text-white px-4 py-2 rounded" onClick={() => handleUpgrade("price_enterprise")}>Upgrade to Enterprise</button>
      </div>
    </div>
  );
}
