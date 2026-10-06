// src/components/Layout.jsx
import React, { useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function Layout({ theme }) {
  const { user, subscription, role, logout, loading } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Define navigation items based on role / tier
  const navItems = [
    { name: "Dashboard", path: "/dashboard", allowed: ["free", "pro", "enterprise", "admin"] },
    { name: "Special Agents", path: "/agents", allowed: ["free", "pro", "enterprise", "admin"] },
    { name: "Dev Tools", path: "/dev-tools", allowed: ["pro", "enterprise", "admin"] },
    { name: "Goals", path: "/goals", allowed: ["free", "pro", "enterprise", "admin"] },
    { name: "Executions", path: "/executions", allowed: ["pro", "enterprise", "admin"] },
    { name: "Admin Panel", path: "/admin", allowed: ["admin"] },
  ];

  const currentTier = subscription || "free";
  const currentRole = role || "user";

  const filteredNav = navItems.filter(
    (item) => item.allowed.includes(currentTier) || item.allowed.includes(currentRole)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0f172a]">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col w-full bg-[#0f172a] text-slate-100">
      {/* Top Navbar */}
      <header
        className="h-16 border-b border-white/10 px-4 md:px-6 flex items-center justify-between sticky top-0 z-40 backdrop-blur-md"
        style={{ backgroundColor: theme?.colors?.surface || "#1e293b" }}
      >
        <div className="flex items-center gap-6">
          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="md:hidden p-2 text-slate-300 hover:text-white rounded-md bg-white/5 border border-white/10"
          >
            {sidebarOpen ? "Close" : "Menu"}
          </button>

          {/* NexusCore Brand Link -> Homepage */}
          <Link
            to="/"
            className="flex items-center gap-2 font-bold text-xl tracking-tight text-white hover:text-indigo-400 transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-extrabold shadow-md shadow-indigo-500/20">
              N
            </div>
            <span>Nexus<span className="text-indigo-400">Core</span></span>
          </Link>
        </div>

        {/* Top Navbar Mounted Quick Links */}
        <div className="hidden md:flex items-center gap-2">
          {filteredNav
            .filter((item) => ["Special Agents", "Dev Tools"].includes(item.name))
            .map((item) => {
              const isActive = location.pathname.startsWith(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors border ${isActive
                    ? "bg-indigo-600/30 border-indigo-500 text-indigo-300"
                    : "border-transparent text-slate-300 hover:bg-white/5 hover:text-white"
                    }`}
                >
                  {item.name}
                </Link>
              );
            })}
        </div>

        {/* User Account / Logout Quick Badge */}
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline-block text-xs text-slate-400 truncate max-w-[150px]">
            {user?.email}
          </span>
          <button
            onClick={() => logout(true)}
            className="px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/10 rounded-lg border border-red-500/20 transition-colors"
          >
            Log Out
          </button>
        </div>
      </header>

      <div className="flex flex-1 min-h-[calc(100vh-64px)] w-full">
        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar Navigation */}
        <aside
          className={`fixed md:static inset-y-0 left-0 z-50 w-64 transform transition-transform duration-200 ease-in-out md:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"
            }`}
          style={{
            backgroundColor: theme?.colors?.surface || "#1e293b",
            borderRight: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div className="flex flex-col h-full justify-between p-4">
            <div className="space-y-6">
              {/* User Info Card */}
              <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                <p className="text-xs text-gray-400">Signed in as</p>
                <p className="text-sm font-semibold truncate text-white">
                  {user?.email || "Authenticated User"}
                </p>
                <div className="mt-2 flex items-center space-x-2">
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 capitalize">
                    {currentTier} tier
                  </span>
                  {currentRole === "admin" && (
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Admin
                    </span>
                  )}
                </div>
              </div>

              {/* Sidebar Navigation Links */}
              <nav className="space-y-1">
                {filteredNav.map((item) => {
                  const isActive = location.pathname.startsWith(item.path);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${isActive
                        ? "bg-indigo-600 text-white"
                        : "text-gray-300 hover:bg-white/5 hover:text-white"
                        }`}
                    >
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Action Footer */}
            <div className="pt-4 border-t border-white/10">
              <button
                onClick={() => logout(true)}
                className="w-full px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-lg transition-colors text-left"
              >
                Log Out
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 p-4 md:p-8 overflow-y-auto">
          {/* Renders the matched nested route child component */}
          <Outlet />
        </main>
      </div>
    </div>
  );
}