import React, { useContext } from "react";
import { Routes, Route, Navigate, Outlet } from "react-router-dom";

// Import AuthContext directly from main app context
import { AuthContext } from "../../../context/AuthProvider";

// Import ProtectedRoute & Pages
import ProtectedRoute from "../components/ProtectedRoute";
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

// Agent Pages
import Dashboard from "../pages/Dashboard";
import AnalyticsPage from "../pages/AnalyticsPage";
import RevenueForecast from "../pages/RevenueForecast";
import AutonomousBrain from "../pages/AutonomousBrain";
import AIReviewInbox from "../pages/AIReviewInbox";
import Billing from "../pages/Billing";
import Playbooks from "../pages/Playbooks";

// Admin Pages
import ExecutiveDashboard from "../pages/ExecutiveDashboard";
import AdminAnalytics from "../pages/AdminAnalytics";
import IncidentCommandCenter from "../pages/IncidentCommandCenter";

// Investor Pages
import InvestorMode from "../pages/InvestorMode";

// Custom hook helper using context directly
function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}

export default function SupportOpsRoutes() {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-900 text-white">
                <p className="animate-pulse text-lg font-mono">Loading SupportOps Workspace...</p>
            </div>
        );
    }

    return (
        <Routes>
            {/* 🌐 Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="features" element={<FeaturesPage />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="signup" element={<SignupPage />} />
            <Route path="cancel" element={<CancelPage />} />
            <Route path="success" element={<SuccessPage />} />

            {/* 🧑‍💼 Agent Routes */}
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

            {/* 🛡 Admin Routes */}
            <Route element={<ProtectedRoute allowRoles={["admin", "management"]} />}>
                <Route path="admin" element={<AdminLayout />}>
                    <Route index element={<Navigate to="executive" replace />} />
                    <Route path="executive" element={<ExecutiveDashboard />} />
                    <Route path="analytics" element={<AdminAnalytics />} />
                    <Route path="incidents" element={<IncidentCommandCenter />} />
                </Route>
            </Route>

            {/* 💰 Investor Routes */}
            <Route element={<ProtectedRoute allowRoles={["investor", "admin"]} />}>
                <Route path="investor" element={<InvestorLayout />}>
                    <Route index element={<InvestorMode />} />
                </Route>
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

export { useAuth };