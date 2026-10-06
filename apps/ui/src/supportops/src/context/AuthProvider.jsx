import { createContext, useEffect, useState, useCallback, useMemo } from "react";
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

  // Helper to resolve token across key naming conventions
  const getStoredToken = () =>
    localStorage.getItem("authToken") || localStorage.getItem("token");

  const logout = useCallback(
    (redirect = true) => {
      localStorage.removeItem("authToken");
      localStorage.removeItem("token");
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
    async (explicitToken = null) => {
      const token = explicitToken || getStoredToken();

      // Early exit for unauthenticated guests — prevents unnecessary blocking calls
      if (!token) {
        setUser(null);
        setSubscription("free");
        setRole("user");
        setLoading(false);
        setInitializing(false);
        return { tier: "free", role: "user" };
      }

      try {
        setLoading(true);

        const response = await fetch(`${BASE_URL}/api/v1/auth/me`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.status === 401) {
          logout(false);
          return { tier: "free", role: "user" };
        }

        if (!response.ok) {
          throw new Error(`Auth verification failed with status ${response.status}`);
        }

        const data = await response.json();
        const activeUser = data.user || data;
        const activeTier = activeUser?.subscription || activeUser?.tier || "free";
        const activeRole = activeUser?.role || "user";

        const userPayload = { ...activeUser, token };
        setUser(userPayload);
        setSubscription(activeTier);
        setRole(activeRole);

        // Keep both storage formats synchronized
        localStorage.setItem("authToken", token);
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(userPayload));

        return { tier: activeTier, role: activeRole };
      } catch (err) {
        console.warn("[Auth] Session verification fallback:", err.message);

        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          try {
            const parsed = JSON.parse(storedUser);
            setUser({ ...parsed, token });
            setSubscription(parsed.subscription || parsed.tier || "free");
            setRole(parsed.role || "user");
            return {
              tier: parsed.subscription || parsed.tier || "free",
              role: parsed.role || "user",
            };
          } catch (e) {
            logout(false);
          }
        } else {
          logout(false);
        }
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

    const token = getStoredToken();
    if (token) {
      refreshSession(token);
    } else {
      setLoading(false);
      setInitializing(false);
    }
  }, [refreshSession]);

  function redirectByTier(tier, userRole, targetLocation = null) {
    if (targetLocation && targetLocation !== "/login" && targetLocation !== "/register") {
      navigate(targetLocation, { replace: true });
      return;
    }

    if (userRole === "admin") {
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
      localStorage.setItem("token", token);
    }
    if (userData) {
      localStorage.setItem("user", JSON.stringify(userData));
    }

    const { tier, role: userRole } = await refreshSession(token);
    redirectByTier(tier, userRole, targetLocation);
  }

  const authFetch = useCallback(
    async (endpoint, options = {}) => {
      const { skipLogoutOn401 = false, ...fetchOptions } = options;
      const token = user?.token || getStoredToken();

      const headers = {
        "Content-Type": "application/json",
        ...(fetchOptions.headers || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const formattedEndpoint = endpoint.startsWith("/api")
        ? endpoint
        : `/api${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

      const res = await fetch(`${BASE_URL}${formattedEndpoint}`, {
        ...fetchOptions,
        headers,
      });

      if (res.status === 401) {
        if (!skipLogoutOn401) {
          logout(true);
        }
        throw new Error("Unauthorized");
      }

      return res;
    },
    [user, logout]
  );

  const contextValue = useMemo(
    () => ({
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
    }),
    [user, subscription, role, loading, initializing, logout, authFetch, refreshSession]
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

export default AuthProvider;