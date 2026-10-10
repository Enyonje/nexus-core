// supportops/src/context/AuthContext.jsx
// SupportOps reads the signed-in user from the main app's AuthProvider.
// Unauthenticated users are allowed guest access for the Pricing page and subscriptions.
import { useContext, useMemo } from "react";
import { AuthContext as MainAuthContext } from "./AuthProvider";
import { AccessContext } from "./AccessProvider";
import { apiFetch } from "../lib/api";

/**
 * Determines the user's role inside SupportOps.
 * Priority:
 * 1. App-specific role: `access.apps.supportops.role`
 * 2. Main platform role fallback: "admin" if user/main role is "admin", "agent" if logged in, else "guest"
 */
function supportOpsRole(user, mainRole, access) {
  if (!user) return "guest";

  const appRole = access?.apps?.supportops?.role;
  if (appRole) return appRole;

  const resolvedMainRole = user?.role ?? mainRole;
  return resolvedMainRole === "admin" ? "admin" : "agent";
}

export function useAuth() {
  const main = useContext(MainAuthContext);
  if (!main) {
    throw new Error("SupportOps must be rendered inside the main app's AuthProvider");
  }

  const access = useContext(AccessContext);
  const { user, loading, initializing, logout, authFetch, role: mainRole } = main;

  const role = supportOpsRole(user, mainRole, access);

  // If no token/user exists, don't hold guest users in an auth loading state
  const isAccessLoading = Boolean(user && access?.loading);
  const isAuthLoading = Boolean((loading || initializing) && user) || isAccessLoading;
  const effectiveAuthFetch = authFetch || apiFetch;

  return useMemo(
    () => ({
      // Provide baseline guest profile when unauthenticated so Pricing/Subscription components don't crash
      user: user
        ? { ...user, role }
        : { id: null, email: null, role: "guest", isGuest: true },
      role,
      loading: isAuthLoading,
      isAuth: Boolean(user),
      isGuest: !user,
      logout: logout || (() => { window.location.href = "/login"; }),
      authFetch: effectiveAuthFetch,
    }),
    [user, role, isAuthLoading, logout, effectiveAuthFetch]
  );
}

export { MainAuthContext as AuthContext };
export default MainAuthContext;