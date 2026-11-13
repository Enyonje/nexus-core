// Nexus Core sign-in. Kept at this path (and with these export names) because most pages import it.
// The implementation is the shared per-product factory in src/auth/createProductAuth.jsx.
import { nexusCoreAuth } from "../auth/instances.js";

export const AuthContext = nexusCoreAuth.AuthContext;
export const AuthProvider = nexusCoreAuth.AuthProvider;
export const useAuth = nexusCoreAuth.useAuth;
export const useAuthContext = nexusCoreAuth.useAuth;
export const useMainAuth = nexusCoreAuth.useAuth;
export default AuthProvider;
