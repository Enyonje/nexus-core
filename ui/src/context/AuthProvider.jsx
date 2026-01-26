import { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [subscription, setSubscription] = useState("free");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Restore session on refresh
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }

    refreshSession();
  }, []);

  async function refreshSession() {
    try {
      setLoading(true);

      const data = await apiFetch("/auth/subscription");

      // backend returns: { active, tier }
      setUser({ token: localStorage.getItem("token") });
      setSubscription(data.tier || "free");
    } catch (err) {
      console.error("Session restore failed:", err);
      logout(false);
    } finally {
      setLoading(false);
    }
  }

  const login = async ({ user, token }) => {
    localStorage.setItem("token", token);
    setUser(user);

    try {
      const data = await apiFetch("/auth/subscription");
      const tier = data.tier || "free";

      setSubscription(tier);
      redirectByTier(tier);
    } catch (err) {
      console.error("Subscription fetch failed:", err);
      setSubscription("free");
      navigate("/dashboard", { replace: true });
    }
  };

  const redirectByTier = (tier) => {
    if (tier === "enterprise") {
      navigate("/streams", { replace: true });
    } else if (tier === "pro") {
      navigate("/executions", { replace: true });
    } else {
      navigate("/dashboard", { replace: true });
    }
  };

  const logout = (redirect = true) => {
    localStorage.removeItem("token");
    setUser(null);
    setSubscription("free");
    if (redirect) navigate("/", { replace: true });
  };

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
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
