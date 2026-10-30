// supportops/src/context/AuthContext.jsx
//
// SupportOps uses the main application's AuthProvider.
// Public visitors can browse without signing in.
// Protected routes must enforce authentication and authorization separately.

import { useContext, useMemo } from "react";

import { AuthContext as MainAuthContext } from "../../../context/AuthProvider";
import { AccessContext } from "../../../context/AccessProvider";

/**
 * Resolve the user's SupportOps role.
 *
 * Priority:
 * 1. Explicit SupportOps app role.
 * 2. Main platform administrator role.
 * 3. Authenticated users default to "agent".
 * 4. Unauthenticated visitors default to "guest".
 *
 * The backend must independently enforce authorization
 * for every protected operation.
 */
function supportOpsRole(user, mainRole, access) {
  if (!user) {
    return "guest";
  }

  const appRole = access?.apps?.supportops?.role;

  if (typeof appRole === "string" && appRole.trim()) {
    return appRole.trim().toLowerCase();
  }

  const resolvedMainRole = String(
    user?.role ?? mainRole ?? ""
  )
    .trim()
    .toLowerCase();

  if (resolvedMainRole === "admin") {
    return "admin";
  }

  return "agent";
}

/**
 * SupportOps authentication hook.
 *
 * Reuses authentication from the main application rather
 * than creating a separate authentication system.
 */
export function useAuth() {
  const main = useContext(MainAuthContext);
  const access = useContext(AccessContext);

  if (main === null || main === undefined) {
    throw new Error(
      "SupportOps must be rendered inside the main app's AuthProvider."
    );
  }

  const {
    user,
    loading,
    initializing,
    logout,
    authFetch,
    role: mainRole,
  } = main;

  const isAuthenticated = Boolean(user);

  const role = supportOpsRole(user, mainRole, access);

  // Only authenticated users need to wait for app permissions.
  const isAccessLoading = Boolean(
    isAuthenticated && access?.loading
  );

  const isAuthLoading = Boolean(
    isAuthenticated && (loading || initializing)
  );

  const isLoading = isAuthLoading || isAccessLoading;

  const resolvedUser = useMemo(() => {
    if (!user) {
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
  }, [user, role]);

  return useMemo(
    () => ({
      user: resolvedUser,
      role,

      // Authentication state
      isAuth: isAuthenticated,
      isAuthenticated,
      isGuest: !isAuthenticated,
      loading: isLoading,

      // Main application authentication helpers
      logout,
      authFetch,
    }),
    [
      resolvedUser,
      role,
      isAuthenticated,
      isLoading,
      logout,
      authFetch,
    ]
  );
}

// Expose the main application's contexts for compatibility.
export { MainAuthContext as AuthContext };

export default MainAuthContext;
