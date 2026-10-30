// src/components/ProtectedRoute.jsx
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function ProtectedRoute({ children, allowed = [] }) {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  // 1. Show a dark, themed loader while checking session state on refresh
  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center text-white font-sans">
        <div className="relative flex items-center justify-center mb-4">
          <div className="w-12 h-12 rounded-full border-2 border-blue-500/20 border-t-blue-500 animate-spin" />
        </div>
        <div className="text-xs font-mono uppercase tracking-[0.2em] text-slate-400 animate-pulse">
          Verifying Identity...
        </div>
      </div>
    );
  }

  // 2. Redirect unauthenticated users to login, preserving full URL path state
  if (!isAuthenticated || !user) {
    return (
      <Navigate
        to="/login"
        state={{ from: `${location.pathname}${location.search}` }}
        replace
      />
    );
  }

  // 3. Optional Role/Tier authorization guard
  if (allowed.length > 0) {
    const userRole = (user.role || "user").toLowerCase();
    const userTier = (user.subscription?.tier || "free").toLowerCase();

    const hasPermission =
      allowed.includes("*") ||
      allowed.map((r) => r.toLowerCase()).includes(userRole) ||
      allowed.map((t) => t.toLowerCase()).includes(userTier);

    if (!hasPermission) {
      return (
        <Navigate
          to="/dashboard"
          state={{ unauthorized: true, attemptedPath: location.pathname }}
          replace
        />
      );
    }
  }

  return children;
}