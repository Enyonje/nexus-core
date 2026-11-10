import React from "react";
import { Navigate } from "react-router-dom";

/** Legacy login alias; use the canonical SupportOps login route. */
export default function LoginPage() {
    return <Navigate to="/supportops/login" replace />;
}
