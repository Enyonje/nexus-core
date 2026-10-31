// src/components/ProtectedRoute.jsx
//
// Works both ways:
//   <ProtectedRoute requiredTier="pro"><Page /></ProtectedRoute>      wrapping one page
//   <Route element={<ProtectedRoute requiredRole="admin" />}> ... </Route>   as a layout route (renders <Outlet />)
//
// Rules:
//   - Anything wrapped here REQUIRES a signed-in user. To make a page public, do not wrap it.
//     (Before, a route with only requiredTier did not clearly require login, so guests were bounced to /subscription
//      or saw a broken page instead of being asked to sign in.)
//   - Signed out            -> /login?next=<where they were going>
//   - Signed in, wrong role -> an "Access denied" screen (a plan upgrade would not help them)
//   - Signed in, low plan   -> /subscription so they can upgrade
//   - Still checking the session -> a spinner. Redirecting before the check finishes logs people out on every refresh.
//
// This is display logic only. The API must enforce the same rules on every request.
import { Link, Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const TIER_RANK = { free: 0, pro: 1, enterprise: 2 };
const ADMIN_ROLES = ["admin", "superadmin"];

function Splash() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#020617] text-sm text-slate-400" role="status">
      Checking your session…
    </div>
  );
}

function AccessDenied() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#020617] px-6 text-slate-200">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-bold text-white">Access denied</h1>
        <p className="mt-3 text-sm text-slate-400">Your account does not have permission to view this page.</p>
        <Link to="/dashboard" className="mt-6 inline-block text-sm text-cyan-400 hover:underline">
          Back to your dashboard
        </Link>
      </div>
    </div>
  );
}

export default function ProtectedRoute({ children, requiredTier, requiredRole }) {
  const auth = useAuth();
  const location = useLocation();

  // Tolerant of the different shapes your auth hooks expose
  const loading = Boolean(auth.initializing ?? auth.loading);
  const user = auth.user ?? null;
  const isAuthed = Boolean(auth.isAuthenticated ?? auth.isAuth ?? user);
  const role = user?.role ?? auth.role;
  const tier = String(auth.subscription ?? user?.subscription ?? "free").toLowerCase();

  if (loading) return <Splash />;

  if (!isAuthed) {
    const next = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />;
  }

  if (requiredRole) {
    const allowed = requiredRole === "admin" ? ADMIN_ROLES : [].concat(requiredRole);
    if (!allowed.includes(role)) return <AccessDenied />;
  }

  if (requiredTier && (TIER_RANK[tier] ?? 0) < (TIER_RANK[requiredTier] ?? 0)) {
    return <Navigate to="/subscription" replace state={{ from: location.pathname, needed: requiredTier }} />;
  }

  return children ?? <Outlet />;
}