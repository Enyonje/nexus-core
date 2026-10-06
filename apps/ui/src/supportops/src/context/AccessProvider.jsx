// apps/ui/src/context/AccessProvider.jsx
// Loads "what may this person do?" from the backend /me and shares it with every app.
// Mount it INSIDE your existing AuthProvider (see main.jsx snippet).
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "./AuthProvider";

const BASE = (
    import.meta.env.VITE_SUPPORTOPS_API_URL ||
    import.meta.env.VITE_API_URL ||
    "http://localhost:3001"
).replace(/\/$/, "");

const ME_URL = `${BASE}${import.meta.env.VITE_AUTH_PREFIX || "/api/v1/auth"}/me`;

export const AccessContext = createContext(null);

export function AccessProvider({ children }) {
    const main = useContext(AuthContext);

    // Resolve token from AuthContext user object or direct localStorage fallback
    const token =
        main?.user?.token ||
        localStorage.getItem("authToken") ||
        localStorage.getItem("token");

    const authLoading = main?.loading ?? false; // Wait for parent AuthProvider to finish checking session
    const navigate = useNavigate();
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [orgId, setOrgId] = useState(() => localStorage.getItem("activeOrgId"));

    const load = useCallback(
        async (signal) => {
            // Prevent fetching if main Auth is still resolving
            if (authLoading) return;

            // Early exit for guests / unauthenticated users — instantly resolve loading state
            if (!token || token === "undefined" || token === "null") {
                setSession(null);
                setLoading(false);
                setError(null);
                return;
            }

            try {
                const res = await fetch(ME_URL, {
                    signal,
                    credentials: "include",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        ...(orgId ? { "X-Org-Id": orgId } : {}),
                    },
                });

                if (res.status === 401) {
                    main?.logout?.(false);
                    setSession(null);
                    setError(null);
                    return;
                } // expired session: clear state quietly without forced redirect

                if (res.status === 403 && orgId) {
                    localStorage.removeItem("activeOrgId");
                    setOrgId(null);
                    return;
                } // stale workspace: fall back

                if (!res.ok) throw new Error(String(res.status));

                const data = await res.json();
                setSession(data);
                setError(null);
                if (data.activeOrgId) localStorage.setItem("activeOrgId", data.activeOrgId);
            } catch (err) {
                if (err.name !== "AbortError") {
                    setSession(null);
                    setError(`Could not load your plan (${err.message}).`); // visible so server errors are explicit
                }
            } finally {
                if (!signal?.aborted) setLoading(false);
            }
        },
        [token, authLoading, orgId, main]
    );

    useEffect(() => {
        if (authLoading) return; // Wait until AuthContext completes initial storage check

        const c = new AbortController();
        setLoading(true);
        load(c.signal);
        return () => c.abort();
    }, [load, authLoading]);

    // Handle post-login redirection if user initiated auth flow from SupportOps
    useEffect(() => {
        if (!session) return;
        const next = sessionStorage.getItem("postAuthRedirect");
        if (!next) return;
        sessionStorage.removeItem("postAuthRedirect");
        if (next.startsWith("/") && !next.startsWith("//")) navigate(next, { replace: true });
    }, [session, navigate]);

    const switchOrg = useCallback((id) => {
        localStorage.setItem("activeOrgId", id);
        window.location.reload();
    }, []);

    const value = useMemo(
        () => ({
            // Guests bypass auth/access loading blocks when no token exists
            loading: token ? loading || authLoading : false,
            error,
            apps: session?.apps ?? {},
            orgs: session?.orgs ?? [],
            activeOrgId: session?.activeOrgId ?? null,
            refresh: () => load(),
            switchOrg,
        }),
        [token, loading, authLoading, error, session, load, switchOrg]
    );

    return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>;
}

/** const { subscribed, plan, status, role, can, usage, limits, trialEndsAt } = useApp("supportops"); */
export function useApp(slug) {
    const ctx = useContext(AccessContext);
    if (!ctx) throw new Error("Wrap the app in <AccessProvider> (main.jsx), inside <AuthProvider>");

    const app = ctx.apps[slug] ?? null;

    return useMemo(
        () => ({
            loading: ctx.loading,
            error: ctx.error,
            subscribed: Boolean(app),
            plan: app?.plan || "free",
            status: app?.status || "active",
            role: app?.role || "guest",
            features: app?.features ?? [],
            limits: app?.limits ?? {},
            usage: app?.usage ?? {},
            trialEndsAt: app?.trialEndsAt,
            can: (feature) => Boolean(app?.features?.includes(feature)),
            refresh: ctx.refresh,
        }),
        [ctx, app]
    );
}