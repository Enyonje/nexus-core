import { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const AuthContext = createContext(null);
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [subscription, setSubscription] = useState("free");
  const [role, setRole] = useState("user"); // ✅ track role separately
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  /* =========================
     INIT SESSION
  ========================= */
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      refreshSession(token);
    } else {
      setLoading(false);
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

      // ✅ store user, role, subscription
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
    }
  }

  /* =========================
     LOGIN
  ========================= */
  async function login({ token }) {
    localStorage.setItem("token", token);
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
    localStorage.removeItem("token");
    setUser(null);
    setSubscription("free");
    setRole("user");
    setLoading(false);

    if (redirect) navigate("/", { replace: true });
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        subscription,
        role,            // ✅ expose role
        setSubscription,
        loading,
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