import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthProvider";

export default function ProtectedRoute({ children, allowed }) {
  const { user, subscription } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  if (!allowed.includes(subscription)) return <Navigate to="/subscription" replace />;

  return children;
}