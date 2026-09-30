import { Navigate } from "react-router-dom";
import AuthProvider from "../context/AuthProvider";
import LoadingSpinner from "./LoadingSpinner";

export default function ProtectedRoute({ children, requiredTier }) {
  const { user, subscription, loading } = AuthProvider();

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