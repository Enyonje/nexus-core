// supportops/src/context/AuthContext.jsx

import {
  useContext,
  useMemo,
  useCallback,
} from "react";

import {
  AuthContext as MainAuthContext,
} from "../../../context/AuthProvider";

import {
  AccessContext,
} from "../../../context/AccessProvider";

/**
* ============================================================
* SUPPORTOPS AUTHENTICATION
* ============================================================
*
* Uses the main application's AuthProvider.
*
* PUBLIC:
* - Landing
* - Features
* - Pricing
* - Login
* - Registration
*
* PROTECTED:
* - Admin workspace
* - Agent workspace
* - Investor workspace
*/

// ============================================================
// ROLE RESOLUTION
// ============================================================

function supportOpsRole(user, access) {
  if (!user || user.isGuest) {
    return "guest";
  }

  const appRole =
    access?.apps?.supportops?.role ||
    user?.appAccess?.find((grant) => grant?.app?.slug === "supportops")?.app_role;

  const metadataRole =
    user?.app_metadata?.role ||
    user?.user_metadata?.role;

  const resolvedRole =
    appRole ||
    metadataRole ||
    user?.role;

  const role = String(resolvedRole || "")
    .trim()
    .toLowerCase();

  const supportedRoles = [
    "admin",
    "management",
    "agent",
    "user",
    "investor",
  ];

  if (supportedRoles.includes(role)) {
    return role;
  }

  return "agent";
}

// ============================================================
// SUPPORTOPS AUTH HOOK
// ============================================================

export function useAuth() {
  const main = useContext(MainAuthContext);

  const access = useContext(AccessContext);

  if (!main) {
    throw new Error(
      "SupportOps must be rendered inside the main AuthProvider."
    );
  }

  const {
    user,
    subscription,
    loading,
    login,
    register: mainRegister,
    logout: mainLogout,
    refreshSession,
  } = main;

  // ========================================================
  // AUTHENTICATION STATE
  // ========================================================

  const isAuthenticated = Boolean(
    user?.id && !user?.isGuest
  );

  const role = supportOpsRole(user, access);

  const isAccessLoading = Boolean(
    isAuthenticated && access?.loading
  );

  const isLoading = Boolean(
    loading || isAccessLoading
  );

  // ========================================================
  // NORMALIZED USER
  // ========================================================

  const resolvedUser = useMemo(() => {
    if (!isAuthenticated) {
      return {
        id: null,
        email: null,
        role: "guest",
        isGuest: true,
      };
    }

    return {
      ...user,
      role,
      isGuest: false,
    };
  }, [user, role, isAuthenticated]);

  // ========================================================
  // LOGIN
  // ========================================================

  const handleLogin = useCallback(
    async (credentials) => {
      if (typeof login !== "function") {
        throw new Error(
          "Login is not available in the main AuthProvider."
        );
      }

      return await login(credentials);
    },
    [login]
  );

  // ========================================================
  // REGISTRATION
  // ========================================================

  /**
   * Compatible with AdminRegisterPage.jsx.
   *
   * The main AuthProvider expects one credentials object.
   *
   * Example:
   * signUp(email, password, { fullName })
   */

  const signUp = useCallback(
    async (email, password, metadata = {}) => {
      if (typeof mainRegister !== "function") {
        throw new Error(
          "Registration is unavailable in the main AuthProvider."
        );
      }

      if (!email || !password) {
        throw new Error(
          "Email and password are required."
        );
      }

      return await mainRegister({
        email: email.trim(),
        password,
        fullName: metadata.fullName || "",
        name: metadata.fullName || "",
      });
    },
    [mainRegister]
  );

  const register = signUp;

  // ========================================================
  // LOGOUT
  // ========================================================

  const handleLogout = useCallback(
    async () => {
      if (typeof mainLogout !== "function") {
        throw new Error(
          "Logout is unavailable in the main AuthProvider."
        );
      }

      return await mainLogout();
    },
    [mainLogout]
  );

  // ========================================================
  // SESSION REFRESH
  // ========================================================

  const refetchAuth = useCallback(
    async () => {
      if (typeof refreshSession !== "function") {
        throw new Error(
          "Session refresh is unavailable."
        );
      }

      return await refreshSession();
    },
    [refreshSession]
  );

  // ========================================================
  // AUTHENTICATION FETCH
  // ========================================================

  /**
   * Uses the application's API helper.
   *
   * This is exposed for compatibility with existing
   * SupportOps components.
   *
   * Import directly if other components need custom
   * authenticated API requests.
   */

  // ========================================================
  // RETURN CONTEXT
  // ========================================================

  return useMemo(
    () => ({
      // User
      user: resolvedUser,
      role,

      // Authentication state
      isAuth: isAuthenticated,
      isAuthenticated,
      isGuest: !isAuthenticated,
      loading: isLoading,
      initializing: loading,

      // Authentication methods
      login: handleLogin,
      signUp,
      register,
      logout: handleLogout,

      // Session
      refetchAuth,

      // Subscription
      subscription:
        subscription ||
        access?.apps?.supportops?.subscription ||
        null,

      // Application access
      access,
    }),
    [
      resolvedUser,
      role,
      isAuthenticated,
      isLoading,
      loading,
      handleLogin,
      signUp,
      register,
      handleLogout,
      refetchAuth,
      subscription,
      access,
    ]
  );
}

// ============================================================
// COMPATIBILITY EXPORTS
// ============================================================

export {
  MainAuthContext as AuthContext,
};

export default MainAuthContext;
