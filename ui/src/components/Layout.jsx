import React from "react";
import { NavLink, useLocation, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthProvider";

export default function Layout({ theme }) {
  const location = useLocation();
  const { subscription, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <span className="text-gray-500 dark:text-gray-300">Loading...</span>
      </div>
    );
  }

  const navLinks = [
    { to: "/dashboard", label: "Dashboard" },
    { to: "/goals", label: "Goals" },
    { to: "/executions", label: "Executions" },
    ...(subscription !== "free"
      ? [{ to: "/streams", label: "Streams" }]
      : []),
    ...(subscription === "enterprise"
      ? [{ to: "/audit", label: "Audit Logs" }]
      : []),
    ...(subscription === "admin"
      ? [{ to: "/admin", label: "Admin" }]
      : []),
    { to: "/subscription", label: "Subscription" },
  ];

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-gray-900">
      {/* SIDEBAR */}
      <aside className="w-56 bg-white dark:bg-gray-800 p-4 space-y-2 border-r">
        <h2 className="font-bold mb-4">Nexus Core</h2>
        {navLinks.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `block px-3 py-2 rounded text-sm font-medium ${
                isActive
                  ? "bg-blue-600 text-white"
                  : "hover:bg-gray-200 dark:hover:bg-gray-700"
              }`
            }
            aria-current={location.pathname.startsWith(to) ? "page" : undefined}
          >
            {label}
          </NavLink>
        ))}
      </aside>

      {/* CONTENT */}
      <main className="flex-1 p-6 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}