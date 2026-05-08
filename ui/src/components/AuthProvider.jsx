import { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const AuthContext = createContext(null);
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [subscription, setSubscription] = useState("free");
  const [role, setRole] = useState("user");
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(true);
  const navigate = useNavigate();

  /* =========================
      INIT SESSION & PING
  ========================= */
  useEffect(() => {
    // Wake backend
    fetch(`${API_URL}/health`).catch(() => console.log("Backend waking up..."));

    const token = localStorage.getItem("authToken");
    if (token) {
      refreshSession(token);
    } else {
      setLoading(false);
      setInitializing(false);
    }
  }, []);

  /* =========================
      REFRESH SESSION
  ========================= */
  async function refreshSession(token) {
    try {
      const res = await fetch(`${API_URL}/auth/subscription`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error("Invalid session");

      const data = await res.json();

      setUser({ token, email: data.email, id: data.id });
      setSubscription(data.tier || "free");
      setRole(data.role || "user");

      return { tier: data.tier || "free", role: data.role || "user" };
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
      REDIRECT
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
      AUTH FETCH HELPER
  ========================= */
  async function authFetch(endpoint, options = {}) {
    const token = user?.token || localStorage.getItem("authToken");
    const headers = {
      ...(options.headers || {}),
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const res = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (res.status === 401) {
      // Token invalid/expired → logout
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
        authFetch, // ✅ expose helper
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
