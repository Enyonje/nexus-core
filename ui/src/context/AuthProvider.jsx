import { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [subscription, setSubscription] = useState("free");
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  /* =========================
     INITIAL SESSION LOAD
  ========================= */
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }

    refreshSession();
  }, []);

  /* =========================
     REFRESH SESSION
  ========================= */
  async function refreshSession() {
    try {
      const data = await apiFetch("/auth/subscription");

      setSubscription(data.tier || "free");
      setUser({ token: localStorage.getItem("token") });
    } catch (err) {
      console.warn("Session invalid");
      logout();
    } finally {
      setLoading(false);
    }
  }

  /* =========================
     LOGIN
  ========================= */
  async function login(loginResponse) {
    localStorage.setItem("token", loginResponse.token);
    setUser(loginResponse.user);

    await refreshSession();

    navigate("/dashboard", { replace: true });
  }

  /* =========================
     LOGOUT
  ========================= */
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

export function useAuth() {
  return useContext(AuthContext);
}
