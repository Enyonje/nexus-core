// src/context/AccessProvider.jsx

import React, {
    createContext,
    useContext,
    useMemo,
} from "react";

import { useAuth } from "./AuthProvider";

export const AccessContext = createContext(null);

const VALID_PLANS = [
    "free",
    "starter",
    "growth",
    "pro",
    "enterprise",
];

const ACTIVE_SUBSCRIPTION_STATUSES = [
    "active",
    "trialing",
];

/**
 * Normalize a value to a lowercase string.
 */
function normalize(value, fallback = "") {
    if (typeof value !== "string") {
        return fallback;
    }

    return value.trim().toLowerCase() || fallback;
}

/**
 * Resolve the current user's subscription plan.
 */
function resolvePlan(user, subscription) {
    const rawPlan =
        subscription?.plan_id ??
        subscription?.tier ??
        user?.subscription?.tier ??
        user?.plan ??
        "free";

    return normalize(rawPlan, "free");
}

/**
 * Resolve the current subscription status.
 *
 * Missing subscription information must not automatically
 * grant paid access.
 */
function resolveSubscriptionStatus(user, subscription) {
    const rawStatus =
        subscription?.status ??
        user?.subscription?.status ??
        "";

    return normalize(rawStatus, "inactive");
}

export const AccessProvider = ({ children }) => {
    const {
        user,
        subscription,
        loading: authLoading,
    } = useAuth();

    const accessControls = useMemo(() => {
        const isAuthenticated = Boolean(user);

        // Public visitors receive no privileged role.
        const role = normalize(
            user?.role,
            isAuthenticated ? "user" : "guest"
        );

        const permissions = Array.isArray(user?.permissions)
            ? user.permissions
            : [];

        const normalizedPermissions = permissions
            .filter((permission) => typeof permission === "string")
            .map((permission) => permission.trim().toLowerCase());

        const plan = resolvePlan(user, subscription);

        const status = resolveSubscriptionStatus(
            user,
            subscription
        );

        const isSubscribed =
            isAuthenticated &&
            ACTIVE_SUBSCRIPTION_STATUSES.includes(status);

        /**
         * Role checks.
         */
        const hasRole = (requiredRoles) => {
            if (!isAuthenticated) {
                return false;
            }

            const roles = Array.isArray(requiredRoles)
                ? requiredRoles
                : [requiredRoles];

            return roles.some(
                (requiredRole) =>
                    normalize(requiredRole) === role
            );
        };

        /**
         * Permission checks.
         *
         * Only explicit permissions or explicitly recognized
         * administrative roles grant access.
         *
         * IMPORTANT:
         * Backend endpoints must independently enforce permissions.
         */
        const hasPermission = (permission) => {
            if (!isAuthenticated || !permission) {
                return false;
            }

            const normalizedPermission =
                normalize(permission);

            // Explicit administrative roles.
            if (
                role === "admin" ||
                role === "owner"
            ) {
                return true;
            }

            return normalizedPermissions.includes(
                normalizedPermission
            );
        };

        /**
         * Plan hierarchy.
         *
         * A plan must be recognized and meet the requested tier.
         */
        const hasPlan = (requiredPlan) => {
            if (!isAuthenticated || !requiredPlan) {
                return false;
            }

            const normalizedPlan =
                normalize(requiredPlan);

            const userPlanIndex =
                VALID_PLANS.indexOf(plan);

            const requiredPlanIndex =
                VALID_PLANS.indexOf(normalizedPlan);

            if (
                userPlanIndex === -1 ||
                requiredPlanIndex === -1
            ) {
                return false;
            }

            // Paid plans require a valid active subscription.
            if (
                normalizedPlan !== "free" &&
                !isSubscribed
            ) {
                return false;
            }

            return userPlanIndex >= requiredPlanIndex;
        };

        /**
         * Check whether a feature is available.
         *
         * The argument is treated as a permission identifier.
         */
        const can = (feature) => {
            return hasPermission(feature);
        };

        /**
         * Evaluate role, permission, and plan requirements.
         */
        const canAccess = (requirement = {}) => {
            if (!isAuthenticated) {
                return false;
            }

            if (
                requirement.role &&
                !hasRole(requirement.role)
            ) {
                return false;
            }

            if (
                requirement.permission &&
                !hasPermission(requirement.permission)
            ) {
                return false;
            }

            if (
                requirement.plan &&
                !hasPlan(requirement.plan)
            ) {
                return false;
            }

            return true;
        };

        return {
            role,
            permissions: normalizedPermissions,
            plan,

            subscriptionStatus: status,
            status,

            isAuthenticated,
            isGuest: !isAuthenticated,

            isSubscribed,
            subscribed: isSubscribed,

            trialEndsAt:
                subscription?.trialEndsAt ??
                subscription?.trial_ends_at ??
                subscription?.expires_at ??
                user?.subscription?.trialEndsAt ??
                null,

            usage: subscription?.usage ?? {},
            limits: subscription?.limits ?? {},

            hasRole,
            hasPermission,
            hasPlan,
            can,
            canAccess,
        };
    }, [user, subscription]);

    const contextValue = useMemo(
        () => ({
            ...accessControls,
            loading: authLoading,
        }),
        [accessControls, authLoading]
    );

    return (
        <AccessContext.Provider value={contextValue}>
            {children}
        </AccessContext.Provider>
    );
};

/**
 * Access context hook.
 */
export const useAccess = () => {
    const context = useContext(AccessContext);

    if (!context) {
        throw new Error(
            "useAccess must be used within an AccessProvider."
        );
    }

    return context;
};

/**
 * Backwards-compatible aliases.
 */
export const useApp = useAccess;
export const useAccessContext = useAccess;

export default AccessProvider;
