import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthProvider";
import { apiFetch } from "../lib/api";

export default function Layout({ children }) {
  const location = useLocation();
  const { user, subscription, setSubscription } = useAuth();
  const [loading, setLoading] = useState(true);

  /* =========================
     LOAD SUBSCRIPTION SAFELY
  ========================= */
  useEffect(() => {
    async function loadSubscription() {
      if (!user?.token) {
        setSubscription("free");
        setLoading(false);
        return;
      }

      try {
        const data = await apiFetch("/auth/subscription");
        setSubscription(data.tier || "free");
      } catch {
        setSubscription("free");
      } finally {
        setLoading(false);
      }
    }

    loadSubscription();
  }, [user, setSubscription]);

  if (loading) return null;

  const navItem = (path, label) => (
    <Link
      to={path}
      className={`block px-3 py-2 rounded text-sm ${
        location.pathname.startsWith(path)
          ? "bg-blue-600 text-white"
          : "hover:bg-gray-200 dark:hover:bg-gray-700"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-gray-900">
      {/* SIDEBAR */}
      <aside className="w-56 bg-white dark:bg-gray-800 p-4 space-y-2 border-r">
        <h2 className="font-bold mb-4">Nexus Core</h2>

        {navItem("/dashboard", "Dashboard")}
        {navItem("/goals", "Goals")}

        {/* ✅ EXECUTIONS AVAILABLE FOR FREE */}
        {navItem("/executions", "Executions")}

        {/* PRO+ */}
        {subscription !== "free" && navItem("/streams", "Streams")}

        {/* ENTERPRISE */}
        {subscription === "enterprise" && navItem("/audit", "Audit Logs")}

        {navItem("/subscription", "Subscription")}
      </aside>

      {/* CONTENT */}
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
