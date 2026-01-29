import React from "react";
import { Link, useLocation, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthProvider";

export default function Layout({ theme }) {
  const location = useLocation();
  const { subscription, loading } = useAuth();

  if (loading) return null;

  const navItem = (path, label) => (
    <Link
      to={path}
      className={`block px-3 py-2 rounded text-sm font-medium ${
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

        {/* FREE USERS CAN EXECUTE (LIMITED) */}
        {navItem("/executions", "Executions")}

        {/* PRO + ENTERPRISE */}
        {subscription !== "free" && navItem("/streams", "Streams")}

        {/* ENTERPRISE ONLY */}
        {subscription === "enterprise" && navItem("/audit", "Audit Logs")}

        {navItem("/subscription", "Subscription")}
      </aside>

      {/* CONTENT */}
      <main className="flex-1 p-6 overflow-y-auto">
        {/* ✅ Outlet renders nested routes from App.jsx */}
        <Outlet />
      </main>
    </div>
  );
}