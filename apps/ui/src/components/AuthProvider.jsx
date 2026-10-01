import { createContext, useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";

export const AuthContext = createContext(null);

const BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:3001").replace(/\/$/, "");

export function AuthProvider({ children = null } = {}) {
  const [user, setUser] = useState(null);
  const [subscription, setSubscription] = useState("free");
  const [role, setRole] = useState("user");
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(true);
  const navigate = useNavigate();

  const logout = useCallback(
    (redirect = true) => {
      localStorage.removeItem("authToken");
      localStorage.removeItem("user");
      setUser(null);
      setSubscription("free");
      setRole("user");
      setLoading(false);
      setInitializing(false);

      if (redirect) {
        navigate("/login", { replace: true });
      }
    },
    [navigate]
  );

  const refreshSession = useCallback(
    async (token) => {
      try {
        const storedUser = localStorage.getItem("user");
        let parsedUser = storedUser ? JSON.parse(storedUser) : null;

        if (!parsedUser) {
          parsedUser = {
            id: "beta-user",
            email: "beta@nexus.com",
            organization: "Nexus Core",
          };
        }

        const activeUser = {
          ...parsedUser,
          token,
        };

        const activeTier = parsedUser?.subscription || "free";
        const activeRole = parsedUser?.role || "user";

        setUser(activeUser);
        setSubscription(activeTier);
        setRole(activeRole);

        return { tier: activeTier, role: activeRole };
      } catch (err) {
        console.warn("Session refresh failed:", err.message);
        logout(false);
        return { tier: "free", role: "user" };
      } finally {
        setLoading(false);
        setInitializing(false);
      }
    },
    [logout]
  );

  useEffect(() => {
    fetch(`${BASE_URL}/api/health`).catch(() => console.log("Backend waking up..."));

    const token = localStorage.getItem("authToken");
    if (token) {
      refreshSession(token);
    } else {
      setLoading(false);
      setInitializing(false);
    }
  }, [refreshSession]);

  function redirectByTier(tier, role, targetLocation = null) {
    if (targetLocation && targetLocation !== "/login" && targetLocation !== "/register") {
      navigate(targetLocation, { replace: true });
      return;
    }

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

  async function login({ user: userData, token, targetLocation }) {
    if (token) {
      localStorage.setItem("authToken", token);
    }
    if (userData) {
      localStorage.setItem("user", JSON.stringify(userData));
    }

    const { tier, role: userRole } = await refreshSession(token || localStorage.getItem("authToken"));
    redirectByTier(tier, userRole, targetLocation);
  }

  async function authFetch(endpoint, options = {}) {
    const token = user?.token || localStorage.getItem("authToken");
    const headers = {
      ...(options.headers || {}),
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const formattedEndpoint = endpoint.startsWith("/api")
      ? endpoint
      : `/api${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

    const res = await fetch(`${BASE_URL}${formattedEndpoint}`, {
      ...options,
      headers,
    });

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
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export default AuthProvider;