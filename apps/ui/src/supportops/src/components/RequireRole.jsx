// supportops/src/components/RequireRole.jsx
import { Outlet } from "react-router-dom";

export default function RequireRole() {
    // Authentication disabled: bypass role checks and render child routes directly
    return <Outlet />;
}