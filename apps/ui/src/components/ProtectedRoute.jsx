import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import LoadingSpinner from "./LoadingSpinner";

export default function ProtectedRoute({ children, requiredTier }) {
  const { user, subscription, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingSpinner />;
  }

  // Preserve the intended path so Login/Register can redirect back after auth
  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (requiredTier && subscription !== requiredTier) {
    return <Navigate to="/subscription" state={{ from: location.pathname }} replace />;
  }

  return children;
}