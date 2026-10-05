// supportops/src/context/AuthContext.jsx
// SupportOps has NO login of its own. It reads the signed-in user from the main app's AuthProvider.
// Kept at this path so existing `import { useAuth } from "../context/AuthContext"` lines still work.
import { useContext, useMemo } from "react";
import { AuthContext as MainAuthContext } from "../../../context/AuthProvider"; // apps/ui/src/context/AuthProvider.jsx
import { AccessContext } from "../../../context/AccessProvider";

// The user's role inside SupportOps.
// Once the central /me returns `apps.supportops.role`, that is used automatically.
// Until then: platform admins are admins, everyone else is an agent.
function supportOpsRole(main, access) {
  return access?.apps?.supportops?.role ?? (main.role === "admin" ? "admin" : "agent");
}

export function useAuth() {
  const main = useContext(MainAuthContext);
  if (!main) {
    throw new Error("SupportOps must be rendered inside the main app's AuthProvider");
  }

  const access = useContext(AccessContext);
  const { user, loading, initializing, logout, authFetch } = main;
  const role = supportOpsRole(main, access);

  return useMemo(
    () => ({
      user: user ? { ...user, role } : null,
      role,
      loading: Boolean(loading || initializing || access?.loading),
      isAuth: Boolean(user),
      logout,
      authFetch,
    }),
    [user, role, loading, initializing, logout, authFetch]
  );
}

export { MainAuthContext as AuthContext };
export default MainAuthContext;
