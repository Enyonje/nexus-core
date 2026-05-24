import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthProvider";

/**
 * SubscriptionGuard
 * Wraps restricted pages/components and ensures only users
 * with the required subscription tiers can access them.
 *
 * @param {Array<string>} required - Allowed subscription tiers
 * @param {string} message - Custom fallback message when access is denied
 * @param {string} redirectTo - Custom redirect path when blocked
 * @param {number} graceDays - Number of days new users can access without subscription
 */
export default function SubscriptionGuard({
  children,
  required = ["pro", "enterprise"],
  message = "SUBSCRIPTION REQUIRED",
  redirectTo = "/subscription",
  graceDays = 0,
}) {
  const { subscription, loading, user } = useAuth(); 
  const navigate = useNavigate();

  // ✅ Calculate account age in days
  const accountAgeDays = user?.createdAt
    ? Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const isWithinGrace = graceDays > 0 && accountAgeDays !== null && accountAgeDays <= graceDays;
  const hasAccess = required.includes(subscription) || isWithinGrace;

  useEffect(() => {
    if (!loading && !hasAccess) {
      navigate(redirectTo, { replace: true });
    }
  }, [subscription, loading, navigate, required, redirectTo, hasAccess]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center text-blue-400 font-mono text-xs tracking-[0.5em]">
        VERIFYING SUBSCRIPTION...
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center text-red-400 font-mono text-xs tracking-[0.5em]">
        {message}
      </div>
    );
  }

  return children;
}
