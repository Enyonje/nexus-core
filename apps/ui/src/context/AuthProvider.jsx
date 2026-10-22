import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { apiFetch } from "../lib/api";

export const AuthContext = createContext(null);

const DEFAULT_GUEST_USER = { id: null, email: null, role: "guest", isGuest: true };
const DEFAULT_GUEST_SUBSCRIPTION = { tier: "free", status: "active" };

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const cached = localStorage.getItem("user");
      return cached ? JSON.parse(cached) : DEFAULT_GUEST_USER;
    } catch {
      return DEFAULT_GUEST_USER;
    }
  });

  const [subscription, setSubscription] = useState(() => {
    try {
      const cached = localStorage.getItem("subscription");
      return cached ? JSON.parse(cached) : DEFAULT_GUEST_SUBSCRIPTION;
    } catch {
      return DEFAULT_GUEST_SUBSCRIPTION;
    }
  });

  const [loading, setLoading] = useState(true);

  const fetchSessionData = useCallback(async () => {
    const token = localStorage.getItem("token") || localStorage.getItem("authToken");
    if (!token) {
      setUser(DEFAULT_GUEST_USER);
      setSubscription(DEFAULT_GUEST_SUBSCRIPTION);
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
    // Normalize credentials to ensure both email/username and password/accessKey are present
    const identifier = credentials.email || credentials.username;
    const secret = credentials.password || credentials.accessKey;

    const payload = {
      ...credentials,
      email: identifier,
      username: identifier,
      password: secret,
      accessKey: secret,
    };

    const res = await apiFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const token = res?.token || res?.accessToken || res?.data?.token;
    const userData = res?.user || res?.data?.user;

    if (token) {
      localStorage.setItem("token", token);
      localStorage.setItem("authToken", token);
      if (userData) {
        localStorage.setItem("user", JSON.stringify(userData));
        setUser(userData);
      } else if (res) {
        // Fallback user object if nested user key is missing
        const fallbackUser = { email: identifier, ...res };
        localStorage.setItem("user", JSON.stringify(fallbackUser));
        setUser(fallbackUser);
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

  const register = async (credentials) => {
    const identifier = credentials.email || credentials.username;
    const secret = credentials.password || credentials.accessKey;

    const payload = {
      ...credentials,
      email: identifier,
      username: identifier,
      password: secret,
      accessKey: secret,
    };

    const res = await apiFetch("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const token = res?.token || res?.accessToken || res?.data?.token;
    const userData = res?.user || res?.data?.user;

    if (token) {
      localStorage.setItem("token", token);
      localStorage.setItem("authToken", token);
      if (userData) {
        localStorage.setItem("user", JSON.stringify(userData));
        setUser(userData);
      } else if (res) {
        const fallbackUser = { email: identifier, ...res };
        localStorage.setItem("user", JSON.stringify(fallbackUser));
        setUser(fallbackUser);
      }
    }

    return res;
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    localStorage.removeItem("subscription");
    setUser(DEFAULT_GUEST_USER);
    setSubscription(DEFAULT_GUEST_SUBSCRIPTION);
    window.location.href = "/";
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        subscription,
        isGuest: !user || Boolean(user.isGuest),
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