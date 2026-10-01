import { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export const AuthContext = createContext(null);

// Normalize API URL to strip any trailing slash
const BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:3001").replace(/\/$/, "");

export function AuthProvider({ children = null } = {}) {
  const [user, setUser] = useState(null);
  const [subscription, setSubscription] = useState("free");
  const [role, setRole] = useState("user");
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(true);
  const navigate = useNavigate();

  /* =========================
      INIT SESSION & HEALTH PING
  ========================= */
  useEffect(() => {
    // Fixed: hit /api/health to match backend route
    fetch(`${BASE_URL}/api/health`).catch(() => console.log("Backend waking up..."));

    const token = localStorage.getItem("authToken");
    if (token) {
      refreshSession(token);
    } else {
      setLoading(false);
      setInitializing(false);
    }
  }, []);

  /* =========================
     REFRESH SESSION (Beta mode: always free)
 ========================= */
  async function refreshSession(token) {
    try {
      // In beta, skip hitting /api/auth/subscription
      // Just treat every user as free tier
      setUser({
        token,
        email: "beta@nexus.com",   // placeholder email
        id: "beta-user",           // placeholder ID
        createdAt: null,
      });
      setSubscription("free");
      setRole("user");

      return { tier: "free", role: "user" };
    } catch (err) {
      console.warn("Session refresh failed:", err.message);
      logout(false);
      return { tier: "free", role: "user" };
    } finally {
      setLoading(false);
      setInitializing(false);
    }
  }


  /* =========================
      LOGIN
  ========================= */
  async function login({ token }) {
    localStorage.setItem("authToken", token);
    const { tier, role } = await refreshSession(token);
    redirectByTier(tier, role);
  }

  /* =========================
      REDIRECT BY TIER / ROLE
  ========================= */
  function redirectByTier(tier, role) {
    if (role === "admin") {
      navigate("/admin", { replace: true });
    } else if (tier === "enterprise") {
      navigate("/streams", { replace: true });
    } else if (tier === "pro") {
      navigate("/executions", { replace: true });
    } else {
      navigate("/dashboard", { replace: true });
    }
  }

  /* =========================
      LOGOUT
  ========================= */
  function logout(redirect = true) {
    localStorage.removeItem("authToken");
    setUser(null);
    setSubscription("free");
    setRole("user");
    setLoading(false);
    setInitializing(false);

    if (redirect) navigate("/", { replace: true });
  }

  /* =========================
      AUTHENTICATED FETCH HELPER
  ========================= */
  async function authFetch(endpoint, options = {}) {
    const token = user?.token || localStorage.getItem("authToken");
    const headers = {
      ...(options.headers || {}),
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    // Auto-prefix /api if component didn't provide it
    const formattedEndpoint = endpoint.startsWith("/api")
      ? endpoint
      : `/api${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

    const res = await fetch(`${BASE_URL}${formattedEndpoint}`, {
      ...options,
      headers
    });

    if (res.status === 401) {
      logout();
      throw new Error("Unauthorized");
    }

    return res;
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        subscription,
        role,
        setSubscription,
        loading,
        initializing,
        login,
        logout,
        authFetch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/* =========================
    EXPORTS & CUSTOM HOOK
========================= */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export default AuthProvider;