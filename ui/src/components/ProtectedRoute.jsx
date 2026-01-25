import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthProvider";
import LoadingSpinner from "./LoadingSpinner";

export default function ProtectedRoute({ children, requiredTier }) {
  const { user, subscription, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredTier && subscription !== requiredTier) {
    return <Navigate to="/subscription" replace />;
  }

  return children;
}