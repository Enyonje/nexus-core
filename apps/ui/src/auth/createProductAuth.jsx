// Factory that gives one product its own, fully separate sign-in state.
//
//   const { AuthProvider, useAuth, AuthContext, RequireAuth } = createProductAuth("compliance");
//
// Each instance talks only to /api/<product>/auth/*, keeps its access token in its own slot, and
// listens only for its own "<product>:auth:unauthorized" event — so signing out of Compliance never
// signs you out of Nexus Core, and a Nexus Core session never opens Compliance pages.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, Outlet, useLocation } from "react-router-dom";
import { apiFetch, refreshSession } from "../lib/api";
import { tokenStore } from "./tokenStore";
import { PRODUCTS } from "./products";

const GUEST_SUBSCRIPTION = { tier: "free", plan: "free", status: "inactive", active: false };
export const TIER_RANK = { free: 0, starter: 1, growth: 2, pro: 2, enterprise: 3 };

export function tierOf(subscription) {
  if (!subscription) return "free";
  if (typeof subscription === "string") return subscription.toLowerCase();
  const active = subscription.active ?? ["active", "trialing"].includes(subscription.status);
  return active ? String(subscription.tier || subscription.plan || "free").toLowerCase() : "free";
}

export function createProductAuth(slug) {
  const product = PRODUCTS[slug];
  if (!product) throw new Error(`Unknown product ${slug}`);
  const AuthContext = createContext(null);
  AuthContext.displayName = `${product.name}Auth`;

  function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [subscription, setSubscription] = useState(GUEST_SUBSCRIPTION);
    const [loading, setLoading] = useState(true);
    const generation = useRef(0);

    const applySession = useCallback((body) => {
      if (!body?.token || !body?.user) return null;
      tokenStore.set(slug, body.token);
      setUser(body.user);
      setSubscription(body.subscription || body.user.subscription || GUEST_SUBSCRIPTION);
      return body;
    }, []);

    const clear = useCallback(() => {
      tokenStore.clear(slug);
      setUser(null);
      setSubscription(GUEST_SUBSCRIPTION);
    }, []);

    const restore = useCallback(async () => {
      const gen = ++generation.current;
      setLoading(true);
      const body = await refreshSession(slug);
      if (gen !== generation.current) return null;
      if (body) applySession(body);
      else clear();
      setLoading(false);
      return body?.user || null;
    }, [applySession, clear]);

    useEffect(() => {
      restore();
      const onUnauthorized = () => {
        generation.current += 1;
        clear();
        setLoading(false);
      };
      window.addEventListener(`${slug}:auth:unauthorized`, onUnauthorized);
      return () => window.removeEventListener(`${slug}:auth:unauthorized`, onUnauthorized);
    }, [restore, clear]);

    const login = useCallback(async ({ email, password, mfaCode }) => {
      if (!email || !password) throw Object.assign(new Error("Enter your email address and password."), { code: "AUTH_MISSING_FIELDS" });
      const body = await apiFetch(`/${slug}/auth/login`, { method: "POST", product: slug, body: { email: email.trim().toLowerCase(), password, mfaCode } });
      generation.current += 1;
      applySession(body);
      setLoading(false);
      return body;
    }, [applySession]);

    const register = useCallback(async ({ email, password, organization, name }) => {
      const body = await apiFetch(`/${slug}/auth/register`, { method: "POST", product: slug, body: { email: email.trim().toLowerCase(), password, organization, name } });
      generation.current += 1;
      applySession(body);
      setLoading(false);
      return body;
    }, [applySession]);

    const logout = useCallback(async ({ redirectTo = product.basePath || "/" } = {}) => {
      generation.current += 1;
      try {
        await apiFetch(`/${slug}/auth/logout`, { method: "POST", product: slug });
      } catch {
        /* the local session is cleared regardless */
      }
      clear();
      if (redirectTo) window.location.assign(redirectTo);
    }, [clear]);

    const forgotPassword = useCallback((email) => apiFetch(`/${slug}/auth/forgot-password`, { method: "POST", product: slug, body: { email } }), []);
    const resetPassword = useCallback((token, password) => apiFetch(`/${slug}/auth/reset-password`, { method: "POST", product: slug, body: { token, password } }), []);

    const value = useMemo(() => {
      const isAuthenticated = Boolean(user?.id);
      return {
        app: slug,
        product,
        user,
        role: user?.role || (isAuthenticated ? "member" : "guest"),
        subscription,
        tier: tierOf(subscription),
        isAuthenticated,
        isGuest: !isAuthenticated,
        loading,
        initializing: loading,
        login,
        register,
        logout,
        forgotPassword,
        resetPassword,
        refreshSession: restore,
        api: (endpoint, options = {}) => apiFetch(endpoint, { ...options, product: slug }),
      };
    }, [user, subscription, loading, login, register, logout, forgotPassword, resetPassword, restore]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
  }

  function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error(`useAuth for ${product.name} must be used inside its AuthProvider`);
    return ctx;
  }

  /**
   * Route guard for this product.
   *   <Route element={<RequireAuth />}> ...            signed in
   *   <Route element={<RequireAuth requiredTier="pro" />}>   signed in + plan
   *   <Route element={<RequireAuth requiredRole="admin" />}> signed in + role
   * Display logic only — the API enforces the same rules.
   */
  function RequireAuth({ children, requiredTier, requiredRole }) {
    const auth = useAuth();
    const location = useLocation();
    if (auth.loading) {
      return <div className="min-h-[60vh] flex items-center justify-center text-sm text-slate-400" role="status">Checking your {product.name} session…</div>;
    }
    if (!auth.isAuthenticated) {
      const next = `${location.pathname}${location.search}`;
      return <Navigate to={`${product.paths.login}?next=${encodeURIComponent(next)}`} replace />;
    }
    if (requiredRole) {
      const allowed = [].concat(requiredRole);
      if (!allowed.includes(auth.role)) {
        return (
          <div className="min-h-[60vh] flex items-center justify-center px-6 text-slate-200">
            <div className="max-w-md text-center">
              <h1 className="text-2xl font-bold text-white">Access denied</h1>
              <p className="mt-3 text-sm text-slate-400">Your account does not have permission to view this page.</p>
              <Link to={product.homePath} className="mt-6 inline-block text-sm text-cyan-400 hover:underline">Back to {product.name}</Link>
            </div>
          </div>
        );
      }
    }
    if (requiredTier && (TIER_RANK[auth.tier] ?? 0) < (TIER_RANK[requiredTier] ?? 0) && auth.role !== "admin") {
      return <Navigate to={product.paths.pricing} replace state={{ from: location.pathname, needed: requiredTier }} />;
    }
    return children ?? <Outlet />;
  }

  return { AuthContext, AuthProvider, useAuth, RequireAuth, product };
}
