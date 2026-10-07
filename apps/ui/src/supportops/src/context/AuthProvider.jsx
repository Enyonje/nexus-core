// src/supportops/src/context/AuthProvider.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import api from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [isAuth, setIsAuth] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async (signal) => {
    const token = localStorage.getItem("access_token") || localStorage.getItem("authToken");

    // 1. Skip network calls if no token is present (prevents expected 401s in console)
    if (!token || token === "undefined" || token === "null") {
      setUser(null);
      setSubscription(null);
      setIsAuth(false);
      setLoading(false);
      return;
    }

    try {
      // 2. Fetch user profile with AbortController signal
      const userRes = await api.get("/auth/me", { signal });
      setUser(userRes.data);
      setIsAuth(true);

      // 3. Fetch subscription details safely
      try {
        const subRes = await api.get("/auth/subscription", { signal });
        setSubscription(subRes.data);
      } catch (subErr) {
        if (subErr.name !== "CanceledError" && subErr.code !== "ERR_CANCELED") {
          console.warn("Could not fetch subscription details:", subErr.message);
        }
      }
    } catch (err) {
      // 4. Handle cancellation gracefully (React 18 Strict Mode double-mount)
      if (err.name === "CanceledError" || err.code === "ERR_CANCELED") {
        return;
      }

      // If token is invalid or expired (401), clean up local storage state
      if (err.response?.status === 401) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("authToken");
        localStorage.removeItem("user");
      }

      setUser(null);
      setSubscription(null);
      setIsAuth(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    checkAuth(controller.signal);

    return () => {
      controller.abort(); // Cancel in-flight request on unmount/remount
    };
  }, [checkAuth]);

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    setUser(null);
    setSubscription(null);
    setIsAuth(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        subscription,
        setSubscription,
        isAuth,
        setIsAuth,
        loading,
        checkAuth,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};