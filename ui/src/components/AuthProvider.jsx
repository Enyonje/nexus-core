import { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const AuthContext = createContext(null);
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [subscription, setSubscription] = useState("free");
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

      setUser({ token });
      setSubscription(data.tier || "free");
      return data.tier || "free"; // ✅ return tier for login flow
    } catch (err) {
      console.warn("Session refresh failed:", err.message);
      logout(false);
      return "free";
    } finally {
      setLoading(false);
    }
  }

  /* =========================
     LOGIN
  ========================= */
  async function login({ token }) {
    localStorage.setItem("token", token);
    const tier = await refreshSession(token);
    redirectByTier(tier); // ✅ use returned tier, not stale state
  }

  /* =========================
     REDIRECT
  ========================= */
  function redirectByTier(tier) {
    if (tier === "enterprise") {
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
    setLoading(false);

    if (redirect) navigate("/", { replace: true });
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        subscription,
        setSubscription, // ✅ expose setter
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