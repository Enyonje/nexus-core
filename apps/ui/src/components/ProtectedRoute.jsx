// Nexus Core route guard (signed in, optional plan / role). See src/auth/createProductAuth.jsx.
//   <Route element={<ProtectedRoute />}>                       signed in
//   <Route element={<ProtectedRoute requiredTier="pro" />}>    Pro plan or higher (admins pass)
//   <Route element={<ProtectedRoute requiredRole="admin" />}>  admins only
import { nexusCoreAuth } from "../auth/instances.js";

export default function ProtectedRoute(props) {
  return <nexusCoreAuth.RequireAuth {...props} />;
}
