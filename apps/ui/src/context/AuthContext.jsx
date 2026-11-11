
/**
 * Nexus Core Authentication Context
 *
 * This file belongs exclusively to Nexus Core.
 *
 * It exposes the context and hooks provided by the local
 * Nexus Core AuthProvider.
 *
 * It does NOT import:
 * - SupportOps AuthProvider
 * - SupportOps AccessProvider
 * - SupportOps role resolution
 * - SupportOps API utilities
 */

import {
  AuthContext,
  useAuth,
  useAuthContext,
  useMainAuth,
} from "./AuthProvider";

// ============================================================
// NEXUS CORE EXPORTS
// ============================================================

export {
  AuthContext,
  useAuth,
  useAuthContext,
  useMainAuth,
};

// Default context export.
export default AuthContext;
