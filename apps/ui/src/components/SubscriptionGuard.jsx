import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { TIER_RANK } from "../auth/createProductAuth.jsx";

/**
 * Hides children unless the Nexus Core plan is one of `required` (or ranks above them).
 * The old version compared the subscription object to strings, so it never blocked anyone.
 */
export default function SubscriptionGuard({ children, required = ["pro", "enterprise"], redirectTo = "/pricing" }) {
  const { tier, role, loading } = useAuth();
  if (loading) return <div className="min-h-[40vh] flex items-center justify-center text-xs text-slate-400">Checking your plan…</div>;
  const minRank = Math.min(...required.map((t) => TIER_RANK[t] ?? 99));
  if (role !== "admin" && (TIER_RANK[tier] ?? 0) < minRank) return <Navigate to={redirectTo} replace state={{ needed: required[0] }} />;
  return children;
}
