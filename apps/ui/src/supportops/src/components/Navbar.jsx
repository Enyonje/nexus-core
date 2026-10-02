import React from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx"; // ✅ ensure filename matches exactly
import CTAButton from "./CTAButton.jsx";

export default function Navbar() {
  const { user, role, logout, isAuth } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-[#0B1220]/80 backdrop-blur border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-blue-600" />
            <span className="font-semibold">SupportOps</span>
          </div>
          <span className="text-xs text-slate-400 hidden md:inline">
            Real-time support automation
          </span>
        </div>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-4 text-sm">
          {role === "agent" && (
            <>
              <NavLink
                to="/agent/dashboard"
                className={({ isActive }) =>
                  `px-2 py-1 rounded ${isActive
                    ? "bg-white/10 text-white"
                    : "text-slate-300 hover:text-white"
                  }`
                }
              >
                Dashboard
              </NavLink>
              <NavLink
                to="/agent/analytics"
                className={({ isActive }) =>
                  `px-2 py-1 rounded ${isActive
                    ? "bg-white/10 text-white"
                    : "text-slate-300 hover:text-white"
                  }`
                }
              >
                Analytics
              </NavLink>
              <NavLink
                to="/agent/brain"
                className={({ isActive }) =>
                  `px-2 py-1 rounded ${isActive
                    ? "bg-white/10 text-white"
                    : "text-slate-300 hover:text-white"
                  }`
                }
              >
                Brain
              </NavLink>
            </>
          )}

          {role === "admin" && (
            <>
              <NavLink
                to="/admin/executive"
                className={({ isActive }) =>
                  `px-2 py-1 rounded ${isActive
                    ? "bg-white/10 text-white"
                    : "text-slate-300 hover:text-white"
                  }`
                }
              >
                Executive
              </NavLink>
              <NavLink
                to="/admin/analytics"
                className={({ isActive }) =>
                  `px-2 py-1 rounded ${isActive
                    ? "bg-white/10 text-white"
                    : "text-slate-300 hover:text-white"
                  }`
                }
              >
                Analytics
              </NavLink>
              <NavLink
                to="/admin/incidents"
                className={({ isActive }) =>
                  `px-2 py-1 rounded ${isActive
                    ? "bg-white/10 text-white"
                    : "text-slate-300 hover:text-white"
                  }`
                }
              >
                Incidents
              </NavLink>
            </>
          )}

          {role === "investor" && (
            <NavLink
              to="/investor"
              className={({ isActive }) =>
                `px-2 py-1 rounded ${isActive
                  ? "bg-white/10 text-white"
                  : "text-slate-300 hover:text-white"
                }`
              }
            >
              Investor Mode
            </NavLink>
          )}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <CTAButton onClick={() => alert("Action clicked!")}>
            Quick Action
          </CTAButton>

          {/* User capsule */}
          {isAuth ? (
            <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-white/5 border border-white/10">
              <span className="text-xs px-2 py-0.5 rounded bg-white/10 text-slate-300">
                {role}
              </span>
              <span className="text-sm text-slate-200 hidden sm:inline">
                {user?.email}
              </span>
              <img
                src="/avatar.png"
                alt="User avatar"
                className="h-8 w-8 rounded-full border border-white/10"
              />
            </div>
          ) : (
            <NavLink
              to="/login"
              className="px-3 py-2 rounded-lg text-sm bg-blue-600 hover:bg-blue-700 text-white font-semibold transition"
            >
              Login
            </NavLink>
          )}

          {isAuth && (
            <button
              onClick={logout}
              className="px-3 py-2 rounded-lg text-sm bg-white/10 hover:bg-white/20 transition"
            >
              Logout
            </button>
          )}
        </div>
      </div>
    </header>
  );
}