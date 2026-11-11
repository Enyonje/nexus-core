import React, { createContext, useContext } from 'react';
import { useAuth } from './AuthProvider';

const AccessContext = createContext(null);

// Role hierarchy definitions
const ROLE_PERMISSIONS = {
    'Super Admin': ['manage_members', 'manage_billing', 'manage_workspace', 'manage_triage', 'view_analytics'],
    'Workspace Admin': ['manage_workspace', 'manage_triage', 'view_analytics'],
    'Support Agent': ['manage_triage', 'view_analytics'],
};

export function AccessProvider({ children }) {
    const { user, loading: authLoading } = useAuth();

    const userRole = user?.role || 'Guest';

    // Check if current user has a specific permission
    const hasPermission = (permission) => {
        if (!user) return false;
        const permissions = ROLE_PERMISSIONS[userRole] || [];
        return permissions.includes(permission);
    };

    // Check if current user meets or exceeds a target role
    const hasRole = (allowedRoles = []) => {
        if (!user) return false;
        if (typeof allowedRoles === 'string') return userRole === allowedRoles;
        return allowedRoles.includes(userRole);
    };

    const value = {
        role: userRole,
        isSuperAdmin: userRole === 'Super Admin',
        isWorkspaceAdmin: userRole === 'Workspace Admin' || userRole === 'Super Admin',
        isAgent: !!user,
        hasPermission,
        hasRole,
        loading: authLoading,
    };

    return (
        <AccessContext.Provider value={value}>
            {children}
        </AccessContext.Provider>
    );
}

export function useAccess() {
    const context = useContext(AccessContext);
    if (!context) {
        throw new Error('useAccess must be used within an AccessProvider');
    }
    return context;
}