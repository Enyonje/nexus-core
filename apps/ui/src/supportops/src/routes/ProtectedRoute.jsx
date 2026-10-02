import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ROUTES, homeForRole } from "../config/paths";

/**
 * Layout-route guard. Usage:
 *   <Route element={<ProtectedRoute allowRoles={["admin"]} />}> ...children... </Route>
 */
export default function ProtectedRoute({ allowRoles = [] }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;

  // Not signed in -> SupportOps login, remembering where they were headed
  if (!user) {
    return <Navigate to={ROUTES.login} state={{ from: location.pathname }} replace />;
  }

  const role = user.role || "agent";

  // Signed in but wrong role -> send them to their own home, not a loop
  if (allowRoles.length > 0 && !allowRoles.includes(role)) {
    return <Navigate to={homeForRole(role)} replace />;
  }

  return <Outlet />;
}
