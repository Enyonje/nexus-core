import { createContext, useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Initialize from localStorage
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      // Try to fetch user + subscription with stored token
      refreshSession(token);
    }
  }, []);

  async function refreshSession(token) {
    setLoading(true);
    try {
      const res = await fetch("/auth/subscription", {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setUser({ token }); // minimal user object
        setSubscription(data.subscription || "free");
      } else {
        logout();
      }
    } catch (err) {
      console.error("Session refresh failed:", err);
      logout();
    } finally {
      setLoading(false);
    }
  }

  const login = async (userData, fallbackTier = "free") => {
    localStorage.setItem("token", userData.token);
    setUser(userData);
    await refreshSession(userData.token); // fetch subscription + set context
    redirectByTier(subscription || fallbackTier);
  };

  const redirectByTier = (tier) => {
    if (tier === "free") {
      navigate("/dashboard", { replace: true });
    } else if (tier === "pro") {
      navigate("/executions", { replace: true });
    } else if (tier === "enterprise") {
      navigate("/streams", { replace: true });
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
    setSubscription("free");
    navigate("/", { replace: true });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        subscription,
        setSubscription,
        loading,
        setLoading,
        login,
        logout,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}