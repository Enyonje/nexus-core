import React, { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthProvider.jsx";

export function RequireAuth({ children }) {
  const { isAuth } = useAuth();
  if (!isAuth) return <Navigate to="/login" replace />;
  return children;
}

export function RequireRole({ roles, children }) {
  const { isAuth, user } = useAuth();
  if (!isAuth) return <Navigate to="/login" replace />;
  if (!user?.role || !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}