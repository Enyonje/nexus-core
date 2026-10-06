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
    async (explicitToken = null) => {
      const token = explicitToken || localStorage.getItem("authToken");

      // Early exit if no token exists — avoids sending unauthenticated network requests
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

        // Verify token against backend /me endpoint
        const response = await fetch(`${BASE_URL}/api/v1/auth/me`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.status === 401) {
          // Token is expired or invalid — clear state without forcing harsh redirects on public pages
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
        localStorage.setItem("user", JSON.stringify(userPayload));

        return { tier: activeTier, role: activeRole };
      } catch (err) {
        console.warn("[Auth] Session verification fallback:", err.message);

        // Fallback to local storage cache if network fails (offline tolerance)
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          try {
            const parsed = JSON.parse(storedUser);
            setUser({ ...parsed, token });
            setSubscription(parsed.subscription || "free");
            setRole(parsed.role || "user");
            return { tier: parsed.subscription || "free", role: parsed.role || "user" };
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
    // Wake up backend non-blockingly
    fetch(`${BASE_URL}/api/health`).catch(() => console.log("Backend waking up..."));

    const token = localStorage.getItem("authToken");
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
    }
    if (userData) {
      localStorage.setItem("user", JSON.stringify(userData));
    }

    const { tier, role: userRole } = await refreshSession(token);
    redirectByTier(tier, userRole, targetLocation);
  }

  /**
   * Universal fetch wrapper with optional 401 auto-logout configuration.
   */
  const authFetch = useCallback(
    async (endpoint, options = {}) => {
      const { skipLogoutOn401 = false, ...fetchOptions } = options;
      const token = user?.token || localStorage.getItem("authToken");

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