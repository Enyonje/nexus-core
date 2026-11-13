// Cross-Border Compliance sign-in: separate session, separate token, separate pages.
import { complianceAuth } from "../auth/instances.js";

export const ComplianceAuthProvider = complianceAuth.AuthProvider;
export const useComplianceAuth = complianceAuth.useAuth;
export const RequireComplianceAuth = complianceAuth.RequireAuth;
