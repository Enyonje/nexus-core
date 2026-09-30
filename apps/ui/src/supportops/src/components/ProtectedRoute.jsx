import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthProvider";

export default function ProtectedRoute({ children }) {
  const { isAuth, loading } = useAuth();

  if (loading) return null;
  if (!isAuth) return <Navigate to="/login" replace />;

  return children;
}
