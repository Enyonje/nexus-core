// supportops/src/context/AuthContext.jsx
// SupportOps has NO login of its own. It reads the signed-in user from the main app's AuthProvider.
// Unauthenticated users are allowed guest access so they can view the Pricing page and subscribe.
import { useContext, useMemo } from "react";
import { AuthContext as MainAuthContext } from "../../../context/AuthProvider"; // apps/ui/src/context/AuthProvider.jsx
import { AccessContext } from "../../../context/AccessProvider";

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

  return useMemo(
    () => ({
      // Provide a baseline guest profile when no token is present so Pricing/Subscription components don't crash on user property reads
      user: user
        ? { ...user, role }
        : { id: null, email: null, role: "guest", isGuest: true },
      role,
      loading: isAuthLoading,
      isAuth: Boolean(user),
      isGuest: !user,
      logout,
      authFetch,
    }),
    [user, role, isAuthLoading, logout, authFetch]
  );
}

export { MainAuthContext as AuthContext };
export default MainAuthContext;