// src/context/AuthProvider.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { apiFetch } from "../lib/api";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const cached = localStorage.getItem("user");
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  const [subscription, setSubscription] = useState(() => {
    try {
      const cached = localStorage.getItem("subscription");
      return cached ? JSON.parse(cached) : { tier: "growth", status: "active" };
    } catch {
      return { tier: "growth", status: "active" };
    }
  });

  const [loading, setLoading] = useState(true);

  const fetchSessionData = useCallback(async () => {
    const token = localStorage.getItem("token") || localStorage.getItem("authToken");
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const userRes = await apiFetch("/auth/me").catch(() => null);
      if (userRes) {
        const resolvedUser = userRes.user || userRes;
        setUser(resolvedUser);
        localStorage.setItem("user", JSON.stringify(resolvedUser));
      }

      const subRes = await apiFetch("/auth/subscription").catch(() => null);
      if (subRes) {
        setSubscription(subRes);
        localStorage.setItem("subscription", JSON.stringify(subRes));
      }
    } catch (err) {
      console.warn("[AuthProvider] Session sync warning:", err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessionData();

    const handleUnauthorized = () => {
      logout();
    };
    window.addEventListener("auth:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("auth:unauthorized", handleUnauthorized);
  }, [fetchSessionData]);

  const login = async (credentials) => {
    const res = await apiFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });

    if (res?.token) {
      localStorage.setItem("token", res.token);
      localStorage.setItem("authToken", res.token);
      if (res.user) {
        localStorage.setItem("user", JSON.stringify(res.user));
        setUser(res.user);
      }
    }

    try {
      const subRes = await apiFetch("/auth/subscription").catch(() => null);
      if (subRes) {
        setSubscription(subRes);
        localStorage.setItem("subscription", JSON.stringify(subRes));
      }
    } catch {
      // Ignore sub sync failure during login flow
    }

    return res;
  };

  const register = async (payload) => {
    const res = await apiFetch("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    if (res?.token) {
      localStorage.setItem("token", res.token);
      localStorage.setItem("authToken", res.token);
      if (res.user) {
        localStorage.setItem("user", JSON.stringify(res.user));
        setUser(res.user);
      }
    }

    return res;
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    localStorage.removeItem("subscription");
    setUser(null);
    setSubscription({ tier: "growth", status: "active" });
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        subscription,
        loading,
        login,
        register,
        logout,
        refreshSession: fetchSessionData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// Named alias exports for robust cross-module resolution
export const useAuthContext = useAuth;
export const useMainAuth = useAuth;

export default AuthProvider;