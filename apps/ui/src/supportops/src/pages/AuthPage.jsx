import React from "react";
import { Navigate } from "react-router-dom";

/**
 * Legacy authentication entry point.
 * Workspace creation is handled by the dedicated admin registration flow.
 * Agents, management users and investors must use an administrator-issued
 * invitation at /supportops/join; users cannot select or self-assign a role.
 */
export default function AuthPage() {
    return <Navigate to="/supportops/login" replace />;
}
