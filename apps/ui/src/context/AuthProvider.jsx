// src/context/AuthProvider.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { apiFetch } from "../lib/api";

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);

  const getStoredToken = () =>
    localStorage.getItem("token") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("authToken");

  const clearAuthStorage = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("access_token");
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
  };

  const logout = useCallback(() => {
    clearAuthStorage();
    setUser(null);
    setSubscription(null);
  }, []);

  const fetchAuthData = useCallback(async () => {
    const token = getStoredToken();

    if (!token) {
      setUser(null);
      setSubscription(null);
      setLoading(false);
      return;
    }

    try {
      const [userData, subData] = await Promise.all([
        apiFetch("/auth/me").catch((err) => {
          console.warn("[AuthProvider] Failed to fetch user profile:", err.message);
          return null;
        }),
        apiFetch("/auth/subscription").catch((err) => {
          console.warn("[AuthProvider] Failed to fetch subscription:", err.message);
          return null;
        }),
      ]);

      if (userData && !userData.error) {
        setUser(userData);
      } else {
        logout();
      }

      if (subData && !subData.error) {
        setSubscription(subData);
      }
    } catch (err) {
      console.error("Auth verification error:", err);
      logout();
    } finally {
      setLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    fetchAuthData();

    const handleUnauthorized = () => logout();
    window.addEventListener("auth:unauthorized", handleUnauthorized);

    return () => {
      window.removeEventListener("auth:unauthorized", handleUnauthorized);
    };
  }, [fetchAuthData, logout]);

  const login = async (credentials) => {
    setLoading(true);

    // Extract values flexibly
    const identifier = credentials.email || credentials.username || "";
    const secret = credentials.password || credentials.accessKey || "";

    // Send unified payload mapping all common alias keys to satisfy Fastify schema
    const payload = {
      email: identifier,
      username: identifier,
      password: secret,
      accessKey: secret,
    };

    try {
      const data = await apiFetch("/auth/login", {
        method: "POST",
        body: payload,
      });

      const token = data?.token || data?.access_token;
      if (token) {
        localStorage.setItem("token", token);
        localStorage.setItem("authToken", token);
      }

      if (data?.user) {
        localStorage.setItem("user", JSON.stringify(data.user));
      }

      await fetchAuthData();
      return data;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    setLoading(true);
    try {
      const data = await apiFetch("/auth/register", {
        method: "POST",
        body: userData,
      });

      const token = data?.token || data?.access_token;
      if (token) {
        localStorage.setItem("token", token);
        localStorage.setItem("authToken", token);
      }

      await fetchAuthData();
      return data;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        subscription,
        loading,
        initializing: loading,
        isAuthenticated: !!user,
        isAuth: !!user,
        login,
        register,
        logout,
        refetchAuth: fetchAuthData,
        setUser,
        setSubscription,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const useAuthContext = useAuth;
export default AuthProvider;