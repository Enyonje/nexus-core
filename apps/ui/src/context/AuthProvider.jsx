import { createContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";

export const AuthContext = createContext({
  user: null,
  subscription: "free",
  loading: true,
  login: () => { },
  logout: () => { },
});

// ✅ Default export
export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [subscription, setSubscription] = useState("free");
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

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
      const data = await apiFetch("/auth/subscription");
      setSubscription(data.tier || "free");
      setUser({ token: localStorage.getItem("token") });
    } catch (err) {
      console.warn("Session invalid:", err);
      logout();
    } finally {
      setLoading(false);
    }
  }

  async function login(loginResponse) {
    localStorage.setItem("token", loginResponse.token);
    setUser(loginResponse.user);
    await refreshSession();
    navigate("/dashboard", { replace: true });
  }

  function logout() {
    localStorage.removeItem("token");
    setUser(null);
    setSubscription("free");
    navigate("/login", { replace: true });
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        subscription,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
