import { createContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export const AuthContext = createContext(null);
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [subscription, setSubscription] = useState("free");
  const [role, setRole] = useState("user");
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${API_URL}/health`).catch(() => console.log("Backend waking up..."));

    const token = localStorage.getItem("authToken");
    if (token) {
      refreshSession(token);
    } else {
      setLoading(false);
      setInitializing(false);
    }
  }, []);

  async function refreshSession(token) {
    try {
      const res = await fetch(`${API_URL}/auth/subscription`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Invalid session");

      const data = await res.json();
      setUser({
        token,
        email: data.email,
        id: data.id,
        createdAt: data.created_at || null,
      });
      setSubscription(data.tier || "free");
      setRole(data.role || "user");
    } catch (err) {
      console.warn("Session refresh failed:", err.message);
      logout(false);
    } finally {
      setLoading(false);
      setInitializing(false);
    }
  }

  async function login({ token }) {
    localStorage.setItem("authToken", token);
    await refreshSession(token);
  }

  function logout(redirect = true) {
    localStorage.removeItem("authToken");
    setUser(null);
    setSubscription("free");
    setRole("user");
    setLoading(false);
    setInitializing(false);
    if (redirect) navigate("/", { replace: true });
  }

  async function authFetch(endpoint, options = {}) {
    const token = user?.token || localStorage.getItem("authToken");
    const headers = {
      ...(options.headers || {}),
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
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

export default AuthProvider;
