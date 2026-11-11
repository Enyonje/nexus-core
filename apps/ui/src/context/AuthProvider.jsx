
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";

import { apiFetch } from "../lib/api";

export const AuthContext = createContext(null);

// ============================================================
// NEXUS CORE AUTH CONFIGURATION
// ============================================================

const NEXUS_CORE_APP = "nexus-core";

const STORAGE = {
  token: "nexusCoreAccessToken",
  user: "nexusCoreUser",
  subscription: "nexusCoreSubscription",
  organization: "nexusCoreActiveOrgId",
};

const DEFAULT_GUEST_USER = {
  id: null,
  email: null,
  role: "guest",
  isGuest: true,
};

const DEFAULT_GUEST_SUBSCRIPTION = {
  tier: "free",
  status: "inactive",
  app: NEXUS_CORE_APP,
};

// ============================================================
// SESSION STORAGE
// ============================================================

function getToken() {
  return localStorage.getItem(STORAGE.token);
}

function saveToken(token) {
  if (token) {
    localStorage.setItem(STORAGE.token, token);
  } else {
    localStorage.removeItem(STORAGE.token);
  }
}

function saveSessionUser(user) {
  if (user) {
    localStorage.setItem(
      STORAGE.user,
      JSON.stringify(user)
    );
  } else {
    localStorage.removeItem(STORAGE.user);
  }
}

function saveSubscription(subscription) {
  if (subscription) {
    localStorage.setItem(
      STORAGE.subscription,
      JSON.stringify(subscription)
    );
  } else {
    localStorage.removeItem(STORAGE.subscription);
  }
}

function persistActiveOrganization(user) {
  const orgId =
    user?.org_id ||
    user?.organization?.id ||
    null;

  if (orgId) {
    localStorage.setItem(
      STORAGE.organization,
      String(orgId)
    );
  } else {
    localStorage.removeItem(STORAGE.organization);
  }
}

// ============================================================
// NEXUS CORE API REQUESTS
// ============================================================

// Explicitly attach the Nexus Core access token.
// This prevents the provider from relying on a shared token key.
// The apiFetch helper must preserve caller-supplied Authorization
// headers when constructing the final request.

async function nexusCoreFetch(endpoint, options = {}) {
  const token = getToken();

  const headers = {
    ...(options.headers || {}),
    "x-app-slug": NEXUS_CORE_APP,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return apiFetch(endpoint, {
    ...options,
    headers,
  });
}

// ============================================================
// RESPONSE NORMALIZATION
// ============================================================

function normalizeUser(response) {
  const user = response?.user || response?.data?.user || response;

  if (!user || !user.id) {
    return null;
  }

  return {
    ...user,
    role: user.role || "user",
    isGuest: false,
  };
}

function normalizeSubscription(response) {
  if (!response) {
    return DEFAULT_GUEST_SUBSCRIPTION;
  }

  return {
    ...response,
    tier:
      response.tier ||
      response.plan_id ||
      response.plan?.key ||
      "free",
    status: response.status || "inactive",
    app: NEXUS_CORE_APP,
  };
}

function extractToken(response) {
  return (
    response?.token ||
    response?.accessToken ||
    response?.data?.token ||
    response?.data?.accessToken ||
    null
  );
}

// ============================================================
// AUTH PROVIDER
// ============================================================

export function AuthProvider({ children }) {
  const [user, setUser] = useState(DEFAULT_GUEST_USER);

  const [subscription, setSubscription] = useState(
    DEFAULT_GUEST_SUBSCRIPTION
  );

  const [loading, setLoading] = useState(true);

  const mountedRef = useRef(true);
  const requestIdRef = useRef(0);

  // ==========================================================
  // GUEST SESSION
  // ==========================================================

  const applyGuestSession = useCallback(() => {
    setUser(DEFAULT_GUEST_USER);
    setSubscription(DEFAULT_GUEST_SUBSCRIPTION);

    saveSessionUser(null);
    saveSubscription(null);

    localStorage.removeItem(STORAGE.organization);
  }, []);

  // ==========================================================
  // SUBSCRIPTION SYNCHRONIZATION
  // ==========================================================

  const syncSubscription = useCallback(async () => {
    try {
      const response = await nexusCoreFetch(
        "/auth/subscription"
      );

      const resolved = normalizeSubscription(response);

      if (resolved.app !== NEXUS_CORE_APP) {
        throw new Error(
          "Subscription response does not belong to Nexus Core."
        );
      }

      setSubscription(resolved);
      saveSubscription(resolved);

      return resolved;
    } catch (error) {
      console.warn(
        "[NexusCoreAuth] Subscription synchronization failed:",
        error.message
      );

      // Subscription failure does not invalidate an otherwise
      // valid Nexus Core authentication session.
      throw error;
    }
  }, []);

  // ==========================================================
  // SESSION RESTORATION
  // ==========================================================

  const fetchSessionData = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    const token = getToken();

    if (!token) {
      applyGuestSession();
      setLoading(false);
      return null;
    }

    setLoading(true);

    try {
      const response = await nexusCoreFetch("/auth/me");

      if (requestId !== requestIdRef.current) {
        return null;
      }

      const resolvedUser = normalizeUser(response);

      if (!resolvedUser) {
        throw new Error(
          "Nexus Core session returned an invalid user."
        );
      }

      // Never accept a session explicitly identified as another app.
      if (
        resolvedUser.app &&
        resolvedUser.app !== NEXUS_CORE_APP
      ) {
        throw new Error(
          "The authenticated session does not belong to Nexus Core."
        );
      }

      setUser(resolvedUser);
      saveSessionUser(resolvedUser);
      persistActiveOrganization(resolvedUser);

      // Subscription information is secondary to authentication.
      try {
        await syncSubscription();
      } catch {
        // Keep the valid user session.
      }

      return resolvedUser;
    } catch (error) {
      if (requestId !== requestIdRef.current) {
        return null;
      }

      console.warn(
        "[NexusCoreAuth] Session validation failed:",
        error.message
      );

      applyGuestSession();
      saveToken(null);

      return null;
    } finally {
      if (
        mountedRef.current &&
        requestId === requestIdRef.current
      ) {
        setLoading(false);
      }
    }
  }, [applyGuestSession, syncSubscription]);

  // ==========================================================
  // AUTH EVENTS
  // ==========================================================

  useEffect(() => {
    mountedRef.current = true;

    fetchSessionData();

    const handleUnauthorized = () => {
      requestIdRef.current += 1;

      applyGuestSession();
      saveToken(null);

      setLoading(false);
    };

    // Dedicated event for Nexus Core.
    window.addEventListener(
      "nexus-core:auth:unauthorized",
      handleUnauthorized
    );

    return () => {
      mountedRef.current = false;

      window.removeEventListener(
        "nexus-core:auth:unauthorized",
        handleUnauthorized
      );
    };
  }, [fetchSessionData, applyGuestSession]);

  // ==========================================================
  // LOGIN
  // ==========================================================

  const login = useCallback(async (credentials) => {
    const identifier = (
      credentials.email || credentials.username || ""
    ).trim().toLowerCase();

    const secret =
      credentials.password || credentials.accessKey;

    if (!identifier || !secret) {
      throw new Error(
        "Both email and password are required."
      );
    }

    const response = await apiFetch("/auth/login", {
      method: "POST",
      headers: {
        "x-app-slug": NEXUS_CORE_APP,
      },
      body: {
        ...credentials,
        email: identifier,
        username: identifier,
        password: secret,
        accessKey: secret,
        intent: NEXUS_CORE_APP,
      },
    });

    const token = extractToken(response);
    const resolvedUser = normalizeUser(response);

    if (!token || !resolvedUser) {
      throw new Error(
        "Login did not return a valid Nexus Core session."
      );
    }

    if (
      resolvedUser.app &&
      resolvedUser.app !== NEXUS_CORE_APP
    ) {
      throw new Error(
        "This account session is not authorized for Nexus Core."
      );
    }

    requestIdRef.current += 1;

    // Only Nexus Core storage is updated.
    saveToken(token);
    saveSessionUser(resolvedUser);
    persistActiveOrganization(resolvedUser);

    setUser(resolvedUser);
    setLoading(false);

    try {
      await syncSubscription();
    } catch {
      // Do not invalidate successful login.
    }

    return response;
  }, [syncSubscription]);

  // ==========================================================
  // REGISTRATION
  // ==========================================================

  const register = useCallback(async (credentials) => {
    const identifier = (
      credentials.email || credentials.username || ""
    ).trim().toLowerCase();

    const secret =
      credentials.password || credentials.accessKey;

    if (!identifier || !secret) {
      throw new Error(
        "Both email and password are required."
      );
    }

    const response = await apiFetch("/auth/register", {
      method: "POST",
      headers: {
        "x-app-slug": NEXUS_CORE_APP,
      },
      body: {
        ...credentials,
        email: identifier,
        username: identifier,
        password: secret,
        accessKey: secret,
        intent: NEXUS_CORE_APP,
      },
    });

    const token = extractToken(response);
    const resolvedUser = normalizeUser(response);

    if (!token || !resolvedUser) {
      throw new Error(
        "Registration did not return a valid Nexus Core session."
      );
    }

    if (
      resolvedUser.app &&
      resolvedUser.app !== NEXUS_CORE_APP
    ) {
      throw new Error(
        "The registration response does not belong to Nexus Core."
      );
    }

    requestIdRef.current += 1;

    saveToken(token);
    saveSessionUser(resolvedUser);
    persistActiveOrganization(resolvedUser);

    setUser(resolvedUser);

    setSubscription(DEFAULT_GUEST_SUBSCRIPTION);
    saveSubscription(DEFAULT_GUEST_SUBSCRIPTION);

    setLoading(false);

    try {
      await syncSubscription();
    } catch {
      // Registration remains successful if subscription lookup fails.
    }

    return response;
  }, [syncSubscription]);

  // ==========================================================
  // LOGOUT
  // ==========================================================

  const logout = useCallback(async () => {
    requestIdRef.current += 1;

    // Immediately clear only the Nexus Core session.
    applyGuestSession();
    saveToken(null);

    try {
      await apiFetch("/auth/logout", {
        method: "POST",
        headers: {
          "x-app-slug": NEXUS_CORE_APP,
        },
      });
    } catch (error) {
      console.warn(
        "[NexusCoreAuth] Server logout failed:",
        error.message
      );
    } finally {
      window.location.assign("/");
    }
  }, [applyGuestSession]);

  // ==========================================================
  // CONTEXT VALUE
  // ==========================================================

  const value = {
    user,
    subscription,

    isGuest: !user || Boolean(user.isGuest),

    isAuthenticated: Boolean(
      user?.id && !user?.isGuest
    ),

    loading,

    login,
    register,
    logout,

    refreshSession: fetchSessionData,

    app: NEXUS_CORE_APP,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// ============================================================
// AUTH HOOKS
// ============================================================

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used within an AuthProvider"
    );
  }

  return context;
}

export const useAuthContext = useAuth;
export const useMainAuth = useAuth;

export default AuthProvider;