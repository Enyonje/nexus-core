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
     INIT SESSION (ON LOAD)
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

      if (!res.ok) throw new Error("Session invalid");

      const data = await res.json();

      setUser({ token });
      setSubscription(data.subscription || "free");
    } catch (err) {
      console.warn("Session refresh failed:", err.message);
      logout(false);
    } finally {
      setLoading(false);
    }
  }

  /* =========================
     LOGIN
  ========================= */
  async function login(userData) {
    localStorage.setItem("token", userData.token);
    setUser(userData);

    await refreshSession(userData.token);

    redirectByTier(userData.subscription || "free");
  }

  /* =========================
     REDIRECT LOGIC
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

    if (redirect) {
      navigate("/", { replace: true });
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        subscription,
        loading,
        login,
        logout,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/* =========================
   HOOK
========================= */
export function useAuth() {
  return useContext(AuthContext);
}
