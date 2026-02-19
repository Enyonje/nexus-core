import { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const AuthContext = createContext(null);
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [subscription, setSubscription] = useState("free");
  const [role, setRole] = useState("user");
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(true); // ✅ Block UI until auth is resolved
  const navigate = useNavigate();

  /* =========================
      INIT SESSION & PING
  ========================= */
  useEffect(() => {
    // 1. "Poke" the Render backend immediately to handle cold starts
    fetch(`${API_URL}/health`).catch(() => console.log("Backend waking up..."));

    // 2. Resolve authentication
    const token = localStorage.getItem("authToken"); // Consistent with api.js key
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
      setInitializing(false); // ✅ Release the UI guard
    }
  }

  /* =========================
      LOGIN
  ========================= */
  async function login({ token }) {
    localStorage.setItem("authToken", token); // Store key as 'authToken'
    const { tier, role } = await refreshSession(token);
    redirectByTier(tier, role);
  }

  /* =========================
      REDIRECT
  ======================== */
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

  return (
    <AuthContext.Provider
      value={{
        user,
        subscription,
        role,
        setSubscription,
        loading,
        initializing, // ✅ Expose initializing to protect Dashboard fetches
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}