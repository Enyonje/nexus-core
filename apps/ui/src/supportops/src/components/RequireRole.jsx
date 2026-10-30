// supportops/src/components/RequireRole.jsx

import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

/**
 * Restricts access to routes based on the user's SupportOps role.
 *
 * Examples:
 *
 * <RequireRole roles={["admin"]} />
 * <RequireRole roles={["admin", "management"]} />
 * <RequireRole roles={["agent", "user", "admin"]} />
 *
 * Authentication and role checks must also be enforced by
 * the backend for protected API endpoints.
 */
export default function RequireRole({ roles = [] }) {
    const { user, isAuth, loading, role } = useAuth();
    const location = useLocation();

    // Wait for authentication and application access to initialize.
    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-300">
                <div className="text-center">
                    <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-slate-600 border-t-indigo-400" />

                    <p>Verifying permissions...</p>
                </div>
            </div>
        );
    }

    // Never allow unauthenticated visitors through a role guard.
    if (!isAuth || !user || user.isGuest) {
        return (
            <Navigate
                to="/supportops/login"
                replace
                state={{
                    from: location,
                    message: "Please sign in to access this page.",
                }}
            />
        );
    }

    // Normalize role names before comparing them.
    const normalizedRole = String(
        role || user.role || ""
    )
        .trim()
        .toLowerCase();

    const allowedRoles = roles.map((item) =>
        String(item).trim().toLowerCase()
    );

    // An empty or missing roles array must not grant access.
    if (
        allowedRoles.length === 0 ||
        !allowedRoles.includes(normalizedRole)
    ) {
        return (
            <Navigate
                to="/supportops"
                replace
                state={{
                    accessDenied: true,
                    message:
                        "You don't have permission to access that page.",
                }}
            />
        );
    }

    return <Outlet />;
}
