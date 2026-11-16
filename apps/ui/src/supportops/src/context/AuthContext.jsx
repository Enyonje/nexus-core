import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { tokenStore } from "../../../auth/tokenStore";
import { API_BASE_URL, refreshSession } from "../../../lib/api";

const AuthContext = createContext(null);
const PRODUCT = "nexus-core";

const ROLE_LABELS = {
  admin: "Super Admin",
  management: "Management",
  agent: "Support Agent",
  investor: "Investor",
};

function applySupportOpsRole(user) {
  const appAccess = user?.appAccess?.find(
    (entry) => entry?.app?.slug === "supportops"
  );

  const rawRole = String(appAccess?.app_role || "").toLowerCase();

  return user
    ? {
        ...user,
        supportopsRole: ROLE_LABELS[rawRole] || null,
        appAccess,
      }
    : null;
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => tokenStore.get(PRODUCT));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [workspace, setWorkspace] = useState(null);

  const refreshUser = useCallback(async (providedToken) => {
    let activeToken = providedToken || tokenStore.get(PRODUCT);

    if (!activeToken) {
      const session = await refreshSession(PRODUCT);
      activeToken = session?.token || null;
    }

    if (!activeToken) {
      setUser(null);
      setWorkspace(null);
      setToken(null);
      return null;
    }

    const response = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
      headers: {
        Authorization: `Bearer ${activeToken}`,
        Accept: "application/json",
        "X-App-Slug": "supportops",
        ...(localStorage.getItem("activeOrgId")
          ? { "X-Org-Id": localStorage.getItem("activeOrgId") }
          : {}),
      },
      credentials: "include",
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.message || data.error || "Your session could not be verified."
      );
    }

    const resolvedUser = applySupportOpsRole(data.user || data);

    setToken(activeToken);
    setUser(resolvedUser);
    setWorkspace(resolvedUser?.organization || null);

    return resolvedUser;
  }, []);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);

      try {
        await refreshUser();
      } catch (error) {
        if (alive) {
          setUser(null);
          setWorkspace(null);
          setToken(tokenStore.get(PRODUCT));
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [refreshUser]);

  const login = useCallback(async (email, password) => {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        email: String(email || "").trim().toLowerCase(),
        password,
        intent: "supportops",
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.token) {
      throw new Error(data.message || data.error || "Invalid email or password.");
    }

    tokenStore.set(PRODUCT, data.token);
    setToken(data.token);

    const resolvedUser = await refreshUser(data.token);

    return { ...data, user: resolvedUser };
  }, [refreshUser]);

  const logout = useCallback(async (redirect = true) => {
    const activeToken = tokenStore.get(PRODUCT);

    try {
      await fetch(`${API_BASE_URL}/api/nexus-core/auth/logout`, {
        method: "POST",
        headers: activeToken
          ? { Authorization: `Bearer ${activeToken}` }
          : {},
        credentials: "include",
      });
    } catch {
      // Complete local logout even if the network request fails.
    }

    tokenStore.clear(PRODUCT);
    setToken(null);
    setUser(null);
    setWorkspace(null);

    if (redirect !== false) {
      window.location.assign("/supportops/login");
    }
  }, []);

  const value = useMemo(() => ({
    user,
    workspace,
    token,
    loading,
    isAuth: Boolean(user?.id),
    isAuthenticated: Boolean(user?.id),
    role: user?.supportopsRole || "guest",
    login,
    logout,
    refreshUser,
    register: async () => {
      throw new Error("Create your SupportOps workspace through onboarding.");
    },
    signUp: async () => {
      throw new Error("Create your SupportOps workspace through onboarding.");
    },
  }), [user, workspace, token, loading, login, logout, refreshUser]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("SupportOps auth must be used inside its provider.");
  }

  return context;
}
