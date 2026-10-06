import { createContext, useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";

export const AuthContext = createContext({
  user: null,
  subscription: "free",
  loading: true,
  login: () => { },
  logout: () => { },
  refreshSession: () => { },
});

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [subscription, setSubscription] = useState("free");
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  const getStoredToken = () =>
    localStorage.getItem("authToken") || localStorage.getItem("token");

  const logout = useCallback(() => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setSubscription("free");
    navigate("/login", { replace: true });
  }, [navigate]);

  const refreshSession = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const [meRes, subRes] = await Promise.allSettled([
        apiFetch("/auth/me"),
        apiFetch("/auth/subscription"),
      ]);

      let userData = null;
      if (meRes.status === "fulfilled" && meRes.value?.user) {
        userData = meRes.value.user;
      } else {
        const cached = localStorage.getItem("user");
        if (cached) userData = JSON.parse(cached);
      }

      if (subRes.status === "fulfilled" && subRes.value?.tier) {
        setSubscription(subRes.value.tier);
      }

      setUser(userData ? { ...userData, token } : { token });
    } catch (err) {
      console.warn("Session revalidation failed:", err);
      logout();
    } finally {
      setLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  async function login(authData, customRedirectPath) {
    const token = authData.token || authData.rawRefreshToken;
    const userData = authData.user || authData;

    if (token) {
      localStorage.setItem("authToken", token);
      localStorage.setItem("token", token);
    }

    if (userData) {
      localStorage.setItem("user", JSON.stringify(userData));
      setUser({ ...userData, token });
    }

    refreshSession();

    const targetPath =
      customRedirectPath || authData.redirectTo || "/swarm";

    if (targetPath) {
      navigate(targetPath, { replace: true });
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