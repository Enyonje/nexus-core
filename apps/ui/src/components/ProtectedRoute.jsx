// src/components/ProtectedRoute.jsx
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import LoadingSpinner from "./LoadingSpinner";

export default function ProtectedRoute({ children, requireAuth = false, requiredTier }) {
  const { user, isGuest, subscription, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingSpinner />;
  }

  // If the route strictly requires authentication and the user is a guest
  if (requireAuth && (isGuest || !user || user.isGuest)) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // Safely resolve user subscription tier (handling both string and object formats)
  if (requiredTier) {
    const userTier = typeof subscription === "string"
      ? subscription.toLowerCase()
      : (subscription?.tier || subscription?.plan_id || "free").toLowerCase();

    const targetTier = requiredTier.toLowerCase();

    // Tier hierarchy ranking
    const tiers = ["free", "starter", "growth", "pro", "enterprise"];
    const userTierIndex = tiers.indexOf(userTier);
    const requiredTierIndex = tiers.indexOf(targetTier);

    // If user's tier is below the required tier, redirect to pricing/subscription
    if (userTierIndex < requiredTierIndex) {
      return <Navigate to="/subscription" state={{ from: location.pathname, requiredTier }} replace />;
    }
  }

  return children;
}