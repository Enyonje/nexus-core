
// supportops/src/components/RequireRole.jsx

import React from "react";

import {
    Navigate,
    Outlet,
    useLocation,
} from "react-router-dom";

import { useAuth } from "../context/AuthContext";

import {
    normalizeRole,
    canAccessWorkspace,
} from "./Access";

/**
 * ============================================================
 * SUPPORTOPS ROLE-BASED ACCESS CONTROL
 * ============================================================
 *
 * ADMIN:
 * Full access to:
 * - Admin Workspace
 * - Agent Workspace
 * - Investor Workspace
 *
 * MANAGEMENT:
 * - Admin Workspace only
 *
 * AGENT:
 * - Agent Workspace only
 *
 * USER:
 * - Agent Workspace only
 *
 * INVESTOR:
 * - Investor Workspace only
 *
 * IMPORTANT:
 * Backend APIs must independently enforce these permissions.
 */

/**
 * Map allowed route roles to workspace permissions.
 *
 * This allows existing App.jsx route declarations to
 * continue working while centralizing workspace permissions.
 */
function hasRoleAccess(user, role, allowedRoles) {
    if (!allowedRoles.length) {
        return false;
    }

    // Administrator has full workspace access.
    if (role === "admin") {
        return true;
    }

    // Check explicitly assigned route roles.
    if (allowedRoles.includes(role)) {
        return true;
    }

    // Management, agents and investors cannot cross
    // their assigned workspace boundaries.
    return false;
}

/**
 * Loading indicator.
 */
function PermissionLoading() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-300">

            <div className="text-center">

                <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-slate-600 border-t-indigo-400" />

                <p>
                    Verifying permissions...
                </p>

            </div>

        </div>
    );
}

/**
 * Access denied screen.
 */
function AccessDenied({ destination }) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6">

            <div className="w-full max-w-md rounded-2xl border border-red-500/20 bg-slate-900 p-8 text-center">

                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 text-red-400">

                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="28"
                        height="28"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <circle cx="12" cy="12" r="10" />

                        <path d="m15 9-6 6" />

                        <path d="m9 9 6 6" />
                    </svg>

                </div>

                <h2 className="text-xl font-bold text-white">
                    Access Restricted
                </h2>

                <p className="mt-3 text-sm leading-6 text-slate-400">
                    You don't have permission to access this workspace.
                    Contact your administrator if you believe
                    this is an error.
                </p>

                <a
                    href={destination}
                    className="mt-6 inline-flex items-center justify-center rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500"
                >
                    Return to your workspace
                </a>

            </div>

        </div>
    );
}

/**
 * ============================================================
 * MAIN REQUIRE ROLE COMPONENT
 * ============================================================
 */
export default function RequireRole({
    roles = [],
}) {
    const {
        user,
        isAuth,
        loading,
        role: authRole,
    } = useAuth();

    const location = useLocation();

    // Wait for authentication initialization.
    if (loading) {
        return <PermissionLoading />;
    }

    // Reject unauthenticated users.
    if (
        !isAuth ||
        !user ||
        user.isGuest
    ) {
        return (
            <Navigate
                to="/supportops/login"
                replace
                state={{
                    from: location,
                    message:
                        "Please sign in to access this workspace.",
                }}
            />
        );
    }

    // Resolve authenticated role.
    const normalizedRole = normalizeRole({
        ...user,
        role:
            authRole ||
            user.role ||
            user.user_metadata?.role ||
            user.app_metadata?.role,
    });

    // Normalize allowed roles.
    const allowedRoles = roles.map((item) =>
        String(item)
            .trim()
            .toLowerCase()
    );

    // Empty role declarations must never grant access.
    if (allowedRoles.length === 0) {
        return (
            <Navigate
                to="/supportops"
                replace
                state={{
                    accessDenied: true,
                    message:
                        "No workspace permissions were configured.",
                }}
            />
        );
    }

    // Administrator can access every workspace.
    const hasAccess = hasRoleAccess(
        user,
        normalizedRole,
        allowedRoles
    );

    if (!hasAccess) {
        // Redirect unauthorized users to their own workspace.
        const workspaceMap = {
            management: "/supportops/admin/executive",
            agent: "/supportops/agent/dashboard",
            user: "/supportops/agent/dashboard",
            investor: "/supportops/investor",
        };

        const destination =
            workspaceMap[normalizedRole] ||
            "/supportops";

        return (
            <AccessDenied
                destination={destination}
            />
        );
    }

    return <Outlet />;
}