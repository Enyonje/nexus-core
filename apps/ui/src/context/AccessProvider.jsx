import React, { createContext, useContext, useMemo } from "react";
import { useAuth } from "./AuthProvider";

export const AccessContext = createContext(null);

export const AccessProvider = ({ children }) => {
    const { user, subscription, loading: authLoading } = useAuth();

    const accessControls = useMemo(() => {
        const role = user?.role || "guest";
        const permissions = user?.permissions || [];
        const plan = subscription?.plan || user?.plan || "free";
        const status = subscription?.status || "inactive";

        const isSubscribed = status === "active" || status === "trialing";

        const hasRole = (requiredRoles) => {
            if (!user) return false;
            if (Array.isArray(requiredRoles)) return requiredRoles.includes(role);
            return role === requiredRoles;
        };

        const hasPermission = (permission) => {
            if (!user) return false;
            if (role === "admin" || role === "owner") return true;
            return permissions.includes(permission);
        };

        const hasPlan = (requiredPlan) => {
            const plans = ["free", "starter", "pro", "enterprise"];
            const userPlanIndex = plans.indexOf(plan.toLowerCase());
            const requiredPlanIndex = plans.indexOf(requiredPlan.toLowerCase());
            return userPlanIndex >= requiredPlanIndex;
        };

        return {
            role,
            permissions,
            plan,
            subscriptionStatus: status,
            isSubscribed,
            subscribed: isSubscribed,
            status,
            trialEndsAt: subscription?.trialEndsAt,
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