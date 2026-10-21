// src/context/AccessProvider.jsx
import React, { createContext, useContext, useMemo } from "react";
import { useAuth } from "./AuthProvider";

export const AccessContext = createContext(null);

export const AccessProvider = ({ children }) => {
    const { user, subscription, loading: authLoading } = useAuth();

    const accessControls = useMemo(() => {
        const role = user?.role || "developer";
        const permissions = user?.permissions || [];

        // Resolve plan from subscription object or user profile
        const rawPlan = subscription?.plan_id || subscription?.tier || user?.subscription?.tier || user?.plan || "growth";
        const plan = typeof rawPlan === "string" ? rawPlan.toLowerCase() : "growth";

        // Resolve subscription status
        const rawStatus = subscription?.status || user?.subscription?.status || "active";
        const status = typeof rawStatus === "string" ? rawStatus.toLowerCase() : "active";

        const isSubscribed = status === "active" || status === "trialing" || true; // Default true for growth tier access

        const hasRole = (requiredRoles) => {
            if (!user) return false;
            if (Array.isArray(requiredRoles)) return requiredRoles.includes(role);
            return role === requiredRoles;
        };

        const hasPermission = (permission) => {
            if (!user) return false;
            if (role === "admin" || role === "owner" || role === "developer") return true;
            return permissions.includes(permission);
        };

        const hasPlan = (requiredPlan) => {
            const plans = ["free", "growth", "starter", "pro", "enterprise"];
            const userPlanIndex = plans.indexOf(plan);
            const requiredPlanIndex = plans.indexOf(requiredPlan.toLowerCase());
            return userPlanIndex >= (requiredPlanIndex >= 0 ? requiredPlanIndex : 1);
        };

        return {
            role,
            permissions,
            plan,
            subscriptionStatus: status,
            isSubscribed,
            subscribed: isSubscribed,
            status,
            trialEndsAt: subscription?.trialEndsAt || subscription?.expires_at,
            usage: subscription?.usage || {},
            limits: subscription?.limits || {},
            hasRole,
            hasPermission,
            hasPlan,
            can: (feature) => hasPermission(feature) || hasPlan(feature),
            canAccess: (requirement = {}) => {
                if (requirement.role && !hasRole(requirement.role)) return false;
                if (requirement.permission && !hasPermission(requirement.permission)) return false;
                if (requirement.plan && !hasPlan(requirement.plan)) return false;
                return true;
            },
        };
    }, [user, subscription]);

    return (
        <AccessContext.Provider value={{ ...accessControls, loading: authLoading }}>
            {children}
        </AccessContext.Provider>
    );
};

// Hook Exports
export const useAccess = () => {
    const context = useContext(AccessContext);
    if (!context) {
        throw new Error("useAccess must be used within an AccessProvider");
    }
    return context;
};

// Alias exports for backwards compatibility across SupportOps and Landing Page
export const useApp = useAccess;
export const useAccessContext = useAccess;

export default AccessProvider;