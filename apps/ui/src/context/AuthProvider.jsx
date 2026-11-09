// src/context/AuthProvider.jsx
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

const DEFAULT_GUEST_USER = {
  id: null,
  email: null,
  role: "guest",
  isGuest: true,
};

const DEFAULT_GUEST_SUBSCRIPTION = {
  tier: "free",
  status: "inactive",
};

function subscriptionRequestOptions() {
  return window.location.pathname.startsWith("/supportops")
    ? { headers: { "x-app-slug": "supportops" } }
    : {};
}

function persistActiveOrganization(user) {
  const orgId = user?.org_id || user?.organization?.id;
  if (orgId) {
    localStorage.setItem("activeOrgId", orgId);
    localStorage.setItem("orgId", orgId);
  } else {
    localStorage.removeItem("activeOrgId");
    localStorage.removeItem("orgId");
  }
}

function getToken() {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("access_token")
  );
}

function normalizeUser(response) {
  const user = response?.user || response;

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
    status: response.status || "active",
  };
}

function saveSessionUser(user) {
  if (user) {
    localStorage.setItem("user", JSON.stringify(user));
  } else {
    localStorage.removeItem("user");
  }
}

function saveSubscription(subscription) {
  if (subscription) {
    localStorage.setItem(
      "subscription",
      JSON.stringify(subscription)
    );
  } else {
    localStorage.removeItem("subscription");
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(DEFAULT_GUEST_USER);

  const [subscription, setSubscription] = useState(
    DEFAULT_GUEST_SUBSCRIPTION
  );

  const [loading, setLoading] = useState(true);

  const mountedRef = useRef(true);
  const requestIdRef = useRef(0);

  const applyGuestSession = useCallback(() => {
    setUser(DEFAULT_GUEST_USER);
    setSubscription(DEFAULT_GUEST_SUBSCRIPTION);

    saveSessionUser(null);
    saveSubscription(null);
  }, []);

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
      const userResponse = await apiFetch("/auth/me");

      if (requestId !== requestIdRef.current) {
        return null;
      }

      const resolvedUser = normalizeUser(userResponse);

      if (!resolvedUser) {
        throw new Error(
          "The session endpoint returned an invalid user"
        );
      }

      setUser(resolvedUser);
      saveSessionUser(resolvedUser);
      persistActiveOrganization(resolvedUser);

      // Subscription information is secondary to authentication.
      try {
        const subscriptionResponse = await apiFetch(
          "/auth/subscription",
          subscriptionRequestOptions()
        );

        if (requestId === requestIdRef.current) {
          const resolvedSubscription =
            normalizeSubscription(subscriptionResponse);

          setSubscription(resolvedSubscription);
          saveSubscription(resolvedSubscription);
        }
      } catch (subscriptionError) {
        console.warn(
          "[AuthProvider] Subscription sync failed:",
          subscriptionError.message
        );

        // Do not discard a valid authenticated session just because
        // subscription data could not be fetched.
      }

      return resolvedUser;
    } catch (error) {
      if (requestId !== requestIdRef.current) {
        return null;
      }

      console.warn(
        "[AuthProvider] Session validation failed:",
        error.message
      );

      applyGuestSession();

      localStorage.removeItem("token");
      localStorage.removeItem("authToken");
      localStorage.removeItem("access_token");

      return null;
    } finally {
      if (
        mountedRef.current &&
        requestId === requestIdRef.current
      ) {
        setLoading(false);
      }
    }
  }, [applyGuestSession]);

  useEffect(() => {
    mountedRef.current = true;

    fetchSessionData();

    const handleUnauthorized = () => {
      requestIdRef.current += 1;
      applyGuestSession();
      setLoading(false);
    };

    window.addEventListener(
      "auth:unauthorized",
      handleUnauthorized
    );

    return () => {
      mountedRef.current = false;

      window.removeEventListener(
        "auth:unauthorized",
        handleUnauthorized
      );
    };
  }, [fetchSessionData, applyGuestSession]);

  const login = useCallback(async (credentials) => {
    const identifier =
      credentials.email || credentials.username;

    const secret =
      credentials.password || credentials.accessKey;

    if (!identifier || !secret) {
      throw new Error(
        "Both email and password are required."
      );
    }

    const response = await apiFetch("/auth/login", {
      method: "POST",
      body: {
        ...credentials,
        email: identifier,
        username: identifier,
        password: secret,
        accessKey: secret,
      },
    });

    const token =
      response?.token ||
      response?.accessToken ||
      response?.data?.token;

    const resolvedUser = normalizeUser(response);

    if (!token || !resolvedUser) {
      throw new Error(
        "Login succeeded without a valid token and user response."
      );
    }

    // Invalidate any in-flight session restoration.
    requestIdRef.current += 1;

    localStorage.setItem("token", token);
    localStorage.setItem("authToken", token);
    persistActiveOrganization(resolvedUser);

    setUser(resolvedUser);
    saveSessionUser(resolvedUser);

    setLoading(false);

    // Retrieve subscription information separately.
    try {
      const subscriptionResponse = await apiFetch(
        "/auth/subscription",
        subscriptionRequestOptions()
      );

      const resolvedSubscription =
        normalizeSubscription(subscriptionResponse);

      setSubscription(resolvedSubscription);
      saveSubscription(resolvedSubscription);
    } catch (error) {
      console.warn(
        "[AuthProvider] Subscription lookup failed:",
        error.message
      );

      // Do not turn successful authentication into a failed login.
    }

    return response;
  }, []);

  const register = useCallback(async (credentials) => {
    const identifier =
      credentials.email || credentials.username;

    const secret =
      credentials.password || credentials.accessKey;

    if (!identifier || !secret) {
      throw new Error(
        "Both email and password are required."
      );
    }

    const response = await apiFetch("/auth/register", {
      method: "POST",
      body: {
        ...credentials,
        email: identifier,
        username: identifier,
        password: secret,
        accessKey: secret,
      },
    });

    const token =
      response?.token ||
      response?.accessToken ||
      response?.data?.token;

    const resolvedUser = normalizeUser(response);

    if (!token || !resolvedUser) {
      throw new Error(
        "Registration did not return a valid authenticated session."
      );
    }

    requestIdRef.current += 1;

    localStorage.setItem("token", token);
    localStorage.setItem("authToken", token);
    persistActiveOrganization(resolvedUser);

    setUser(resolvedUser);
    saveSessionUser(resolvedUser);

    setSubscription(DEFAULT_GUEST_SUBSCRIPTION);
    saveSubscription(DEFAULT_GUEST_SUBSCRIPTION);

    setLoading(false);

    return response;
  }, []);

  const logout = useCallback(async () => {
    requestIdRef.current += 1;

    // Clear client-side authentication immediately.
    applyGuestSession();

    localStorage.removeItem("token");
    localStorage.removeItem("authToken");
    localStorage.removeItem("access_token");

    try {
      await apiFetch("/auth/logout", {
        method: "POST",
      });
    } catch (error) {
      console.warn(
        "[AuthProvider] Server logout failed:",
        error.message
      );
    } finally {
      window.location.assign("/");
    }
  }, [applyGuestSession]);

  const value = {
    user,
    subscription,
    isGuest: !user || Boolean(user.isGuest),
    isAuthenticated: Boolean(user?.id && !user?.isGuest),
    loading,
    login,
    register,
    logout,
    refreshSession: fetchSessionData,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

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
