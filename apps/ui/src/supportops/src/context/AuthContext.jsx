// supportops/src/context/AuthContext.jsx
// SupportOps has NO login of its own. It reads the signed-in user from the main app's AuthProvider.
// Kept at this path so existing `import { useAuth } from "../context/AuthContext"` lines still work.
import { useContext, useMemo } from "react";
import { AuthContext as MainAuthContext } from "../../../context/AuthProvider"; // apps/ui/src/context/AuthProvider.jsx
import { AccessContext } from "../../../context/AccessProvider";

/**
 * Determines the user's role inside SupportOps.
 * Priority:
 * 1. App-specific role: `access.apps.supportops.role`
 * 2. Main platform role fallback: "admin" if user/main role is "admin", else "agent"
 */
function supportOpsRole(user, mainRole, access) {
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
  const isAccessLoading = Boolean(access?.loading);
  const isAuthLoading = Boolean(loading || initializing || isAccessLoading);

  return useMemo(
    () => ({
      user: user ? { ...user, role } : null,
      role,
      loading: isAuthLoading,
      isAuth: Boolean(user),
      logout,
      authFetch,
    }),
    [user, role, isAuthLoading, logout, authFetch]
  );
}

export { MainAuthContext as AuthContext };
export default MainAuthContext;