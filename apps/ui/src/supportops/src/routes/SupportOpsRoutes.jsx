import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import { ROUTES } from "../config/paths";
import { useAuth } from "../context/AuthContext";

// Guard
import ProtectedRoute from "../components/ProtectedRoute";

// Public pages
import LandingPage from "../pages/LandingPage";
import LoginPage from "../pages/LoginPage";
import SignupPage from "../pages/SignupPage";
import FeaturesPage from "../pages/FeaturesPage";
import CancelPage from "../pages/CancelPage";
import SuccessPage from "../pages/SuccessPage";

// Layouts
import AgentLayout from "../layouts/AgentLayout";
import AdminLayout from "../layouts/AdminLayout";
import InvestorLayout from "../layouts/InvestorLayout";

// Agent pages
import Dashboard from "../pages/Dashboard";
import AnalyticsPage from "../pages/AnalyticsPage";
import RevenueForecast from "../pages/RevenueForecast";
import AutonomousBrain from "../pages/AutonomousBrain";
import AIReviewInbox from "../pages/AIReviewInbox";
import Billing from "../pages/Billing";
import Playbooks from "../pages/Playbooks";

// Admin pages
import ExecutiveDashboard from "../pages/ExecutiveDashboard";
import AdminAnalytics from "../pages/AdminAnalytics";
import IncidentCommandCenter from "../pages/IncidentCommandCenter";

// Investor pages
import InvestorMode from "../pages/InvestorMode";

/**
 * Mounted by the outer app at <Route path="/supportops/*" />.
 * Every path below is RELATIVE to /supportops (do not use p() here).
 * Use p() / ROUTES only for <Link to>, navigate(), and <Navigate to>.
 */
export default function SupportOpsRoutes() {
    const { loading } = useAuth();

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-900 text-white">
                <p className="animate-pulse text-lg font-mono">Loading SupportOps Workspace...</p>
            </div>
        );
    }

    return (
        <Routes>
            {/* Public: /supportops, /supportops/login, ... */}
            <Route index element={<LandingPage />} />
            <Route path="features" element={<FeaturesPage />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="signup" element={<SignupPage />} />
            <Route path="cancel" element={<CancelPage />} />
            <Route path="success" element={<SuccessPage />} />

            {/* Agent: /supportops/agent/* */}
            <Route element={<ProtectedRoute allowRoles={["agent", "user", "admin"]} />}>
                <Route path="agent" element={<AgentLayout />}>
                    <Route index element={<Navigate to="dashboard" replace />} />
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="analytics" element={<AnalyticsPage />} />
                    <Route path="revenue" element={<RevenueForecast />} />
                    <Route path="brain" element={<AutonomousBrain />} />
                    <Route path="inbox" element={<AIReviewInbox />} />
                    <Route path="billing" element={<Billing />} />
                    <Route path="playbooks" element={<Playbooks />} />
                </Route>
            </Route>

            {/* Admin: /supportops/admin/* */}
            <Route element={<ProtectedRoute allowRoles={["admin", "management"]} />}>
                <Route path="admin" element={<AdminLayout />}>
                    <Route index element={<Navigate to="executive" replace />} />
                    <Route path="executive" element={<ExecutiveDashboard />} />
                    <Route path="analytics" element={<AdminAnalytics />} />
                    <Route path="incidents" element={<IncidentCommandCenter />} />
                </Route>
            </Route>

            {/* Investor: /supportops/investor */}
            <Route element={<ProtectedRoute allowRoles={["investor", "admin"]} />}>
                <Route path="investor" element={<InvestorLayout />}>
                    <Route index element={<InvestorMode />} />
                </Route>
            </Route>

            {/* Fallback stays inside SupportOps (Navigate "to" is absolute) */}
            <Route path="*" element={<Navigate to={ROUTES.home} replace />} />
        </Routes>
    );
}
