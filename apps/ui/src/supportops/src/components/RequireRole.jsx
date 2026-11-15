import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { RefreshCw, ShieldAlert } from 'lucide-react';

// Import dedicated SupportOps context providers
import { useAuth } from '../context/AuthProvider';
import { useAccess } from '../context/AccessProvider';


/**
 * Safe Auth hook resolver to avoid "useAuth must be used within an AuthProvider" errors
 */
function useSafeAuth() {
    try { return useAuth(); }
    catch { return { user: null, isAuthenticated: false, loading: false }; }
}

function useSafeAccess() {
    try { return useAccess(); }
    catch { return { hasRole: () => false, loading: false }; }
}

/**
 * RequireRole Component
 * Guarantees role enforcement for protected workspace routes.
 */
export default function RequireRole({ allowedRoles, roles, children }) {
    const requestedRoles = allowedRoles || roles || [];
    const { user, loading: authLoading, isAuthenticated } = useSafeAuth();
    const { hasRole, loading: accessLoading } = useSafeAccess();
    const location = useLocation();

    if (authLoading || accessLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-300">
                <RefreshCw className="mr-3 h-6 w-6 animate-spin text-cyan-400" />
                <span>Verifying workspace role permissions...</span>
            </div>
        );
    }

    // 1. Unauthenticated -> Redirect to Login
    if (!isAuthenticated && !user) {
        return (
            <Navigate
                to="/supportops/login"
                replace
                state={{ from: location, message: 'Please sign in to access this workspace section.' }}
            />
        );
    }

    // 2. Normalize user roles
    const currentRole = (user?.appAccess?.find?.((entry) => entry?.app?.slug === 'supportops')?.app_role || user?.supportopsRole || 'Guest').toLowerCase().trim();
    const normalizedAllowedRoles = (Array.isArray(requestedRoles) ? requestedRoles : [requestedRoles]).map((r) => String(r).toLowerCase().trim());

    // Super Admin override or matching allowed roles check
    const isAllowed =
        normalizedAllowedRoles.includes(currentRole) ||
        normalizedAllowedRoles.includes(currentRole === 'super admin' ? 'admin' : currentRole === 'support agent' ? 'agent' : currentRole);

    // 3. Unauthorized Role -> Show Restricted Notice or Redirect
    if (!isAllowed) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6">
                <div className="w-full max-w-md rounded-2xl border border-red-500/30 bg-slate-900/80 p-8 text-center shadow-2xl space-y-4">
                    <ShieldAlert className="mx-auto h-12 w-12 text-red-400" />
                    <h2 className="text-xl font-bold text-white">Access Restricted</h2>
                    <p className="text-sm text-slate-400">
                        Your role (<span className="text-cyan-400 font-semibold">{user?.supportopsRole || currentRole || 'Guest'}</span>) does not have access privileges for this section.
                    </p>
                    <button
                        type="button"
                        onClick={() => window.location.assign('/supportops/admin/executive')}
                        className="w-full mt-2 rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-500 transition-colors shadow-lg shadow-cyan-600/20"
                    >
                        Return to Executive Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return children ? children : <Outlet />;
}