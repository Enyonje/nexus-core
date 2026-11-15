import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const AuthContext = createContext(null);
const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/api\/?$/, "").replace(/\/$/, "");
const TOKEN_KEYS = ["token", "authToken", "access_token", "supportops_token"];
const ROLE_LABELS = { admin: "Super Admin", management: "Management", agent: "Support Agent", investor: "Investor" };

function readToken() {
  for (const key of TOKEN_KEYS) {
    const value = localStorage.getItem(key);
    if (value) return value;
  }
  return null;
}
function applySupportOpsRole(user) {
  const appAccess = user?.appAccess?.find((entry) => entry?.app?.slug === "supportops");
  const rawRole = String(appAccess?.app_role || "").toLowerCase();
  return user ? { ...user, supportopsRole: ROLE_LABELS[rawRole] || null, appAccess } : null;
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => readToken());
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [workspace, setWorkspace] = useState(null);

  const clearSession = useCallback(() => {
    TOKEN_KEYS.forEach((key) => localStorage.removeItem(key));
    setToken(null); setUser(null); setWorkspace(null);
  }, []);

  const refreshUser = useCallback(async (activeToken = readToken()) => {
    if (!activeToken) { setUser(null); setWorkspace(null); return null; }
    const response = await fetch(`${API_BASE}/api/v1/auth/me`, {
      headers: {
        Authorization: `Bearer ${activeToken}`,
        Accept: "application/json",
        "X-App-Slug": "supportops",
        ...(localStorage.getItem("activeOrgId") ? { "X-Org-Id": localStorage.getItem("activeOrgId") } : {}),
      },
      credentials: "include",
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || data.error || "Your Nexus session could not be verified.");
    const resolvedUser = applySupportOpsRole(data.user || data);
    setUser(resolvedUser);
    setWorkspace(resolvedUser?.organization || null);
    return resolvedUser;
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const activeToken = readToken();
        if (activeToken) await refreshUser(activeToken);
        else { setUser(null); setWorkspace(null); }
      } catch (error) {
        if (alive) clearSession();
      } finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [refreshUser, clearSession, token]);

  const login = useCallback(async (email, password) => {
    const response = await fetch(`${API_BASE}/api/v1/auth/login`, {
      method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" },
      credentials: "include", body: JSON.stringify({ email: String(email || "").trim().toLowerCase(), password, intent: "supportops" }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.token) throw new Error(data.message || data.error || "Invalid email or password.");
    TOKEN_KEYS.forEach((key) => localStorage.setItem(key, data.token));
    setToken(data.token);
    const resolvedUser = await refreshUser(data.token);
    return { ...data, user: resolvedUser };
  }, [refreshUser]);

  const logout = useCallback(async (redirect = true) => {
    const activeToken = readToken();
    try {
      if (activeToken) await fetch(`${API_BASE}/api/v1/auth/logout`, { method: "POST", headers: { Authorization: `Bearer ${activeToken}` }, credentials: "include" });
    } catch { /* local logout must still complete */ }
    clearSession();
    if (redirect !== false) window.location.assign("/supportops/login");
  }, [clearSession]);

  const value = useMemo(() => ({
    user, workspace, token, loading, isAuth: Boolean(user?.id), isAuthenticated: Boolean(user?.id),
    role: user?.supportopsRole || "guest", login, logout, refreshUser,
    register: async () => { throw new Error("Create your SupportOps workspace through the onboarding page."); },
    signUp: async () => { throw new Error("Create your SupportOps workspace through the onboarding page."); },
  }), [user, workspace, token, loading, login, logout, refreshUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("SupportOps auth must be used inside its shared-session provider.");
  return context;
}
