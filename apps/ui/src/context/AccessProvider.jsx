
import React, {
    createContext,
    useContext,
    useMemo,
} from "react";

import { useAuth } from "./AuthProvider";

// ============================================================
// NEXUS CORE ACCESS CONTROL
// ============================================================

export const AccessContext = createContext(null);

const NEXUS_CORE_APP = "nexus-core";

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

// ============================================================
// NORMALIZATION
// ============================================================

function normalize(value, fallback = "") {
    if (typeof value !== "string") {
        return fallback;
    }

    return value.trim().toLowerCase() || fallback;
}

function isRealUser(user) {
    return Boolean(
        user?.id &&
        !user?.isGuest
    );
}

// ============================================================
// SUBSCRIPTION RESOLUTION
// ============================================================

function resolvePlan(user, subscription) {
    const rawPlan =
        subscription?.tier ??
        subscription?.plan?.key ??
        user?.subscription?.tier ??
        user?.plan ??
        "free";

    const plan = normalize(rawPlan, "free");

    return VALID_PLANS.includes(plan)
        ? plan
        : "free";
}

function resolveSubscriptionStatus(user, subscription) {
    const rawStatus =
        subscription?.status ??
        user?.subscription?.status ??
        "inactive";

    return normalize(rawStatus, "inactive");
}

function resolveSubscriptionApp(subscription) {
    return normalize(
        subscription?.app,
        NEXUS_CORE_APP
    );
}

// ============================================================
// ACCESS PROVIDER
// ============================================================

export const AccessProvider = ({ children }) => {
    const {
        user,
        subscription,
        loading: authLoading,
    } = useAuth();

    const accessControls = useMemo(() => {
        const isAuthenticated = isRealUser(user);

        const role = normalize(
            user?.role,
            isAuthenticated ? "user" : "guest"
        );

        // Never use permissions from another application.
        const permissions = Array.isArray(user?.permissions)
            ? user.permissions
                .filter(
                    (permission) =>
                        typeof permission === "string"
                )
                .map((permission) =>
                    permission.trim().toLowerCase()
                )
            : [];

        const plan = resolvePlan(user, subscription);

        const status = resolveSubscriptionStatus(
            user,
            subscription
        );

        const subscriptionApp =
            resolveSubscriptionApp(subscription);

        // A subscription explicitly belonging to another
        // application cannot grant Nexus Core paid access.
        const isNexusCoreSubscription =
            subscriptionApp === NEXUS_CORE_APP;

        const isSubscribed =
            isAuthenticated &&
            isNexusCoreSubscription &&
            ACTIVE_SUBSCRIPTION_STATUSES.includes(status);

        // ====================================================
        // ROLE CHECKS
        // ====================================================

        const hasRole = (requiredRoles) => {
            if (!isAuthenticated || !requiredRoles) {
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

        // ====================================================
        // PERMISSION CHECKS
        // ====================================================

        const hasPermission = (permission) => {
            if (
                !isAuthenticated ||
                !permission ||
                typeof permission !== "string"
            ) {
                return false;
            }

            const normalizedPermission =
                normalize(permission);

            // Explicit Nexus Core administrative roles.
            if (
                role === "admin" ||
                role === "owner"
            ) {
                return true;
            }

            return permissions.includes(
                normalizedPermission
            );
        };

        // ====================================================
        // PLAN CHECKS
        // ====================================================

        const hasPlan = (requiredPlan) => {
            if (
                !isAuthenticated ||
                !requiredPlan
            ) {
                return false;
            }

            const normalizedRequiredPlan =
                normalize(requiredPlan);

            const currentPlanIndex =
                VALID_PLANS.indexOf(plan);

            const requiredPlanIndex =
                VALID_PLANS.indexOf(
                    normalizedRequiredPlan
                );

            if (
                currentPlanIndex === -1 ||
                requiredPlanIndex === -1
            ) {
                return false;
            }

            // Free access does not require a paid subscription.
            if (normalizedRequiredPlan === "free") {
                return true;
            }

            // Paid access requires an active Nexus Core subscription.
            if (!isSubscribed) {
                return false;
            }

            return currentPlanIndex >= requiredPlanIndex;
        };

        // ====================================================
        // FEATURE CHECKS
        // ====================================================

        const can = (feature) => {
            return hasPermission(feature);
        };

        // ====================================================
        // COMBINED ACCESS CHECK
        // ====================================================

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

        // ====================================================
        // NEXUS CORE ACCESS STATE
        // ====================================================

        return {
            app: NEXUS_CORE_APP,

            role,

            permissions,

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

// ============================================================
// NEXUS CORE ACCESS HOOK
// ============================================================

export const useAccess = () => {
    const context = useContext(AccessContext);

    if (!context) {
        throw new Error(
            "useAccess must be used within Nexus Core AccessProvider."
        );
    }

    return context;
};

// ============================================================
// BACKWARDS-COMPATIBLE EXPORTS
// ============================================================

export const useApp = useAccess;

export const useAccessContext = useAccess;

export default AccessProvider;
