import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import { ROUTES } from "../config/paths";

// Public pages
import LandingPage from "../pages/LandingPage";
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

export default function SupportOpsRoutes() {
    return (
        <Routes>
            {/* Marketing pages */}
            <Route index element={<LandingPage />} />
            <Route path="features" element={<FeaturesPage />} />
            <Route path="cancel" element={<CancelPage />} />
            <Route path="success" element={<SuccessPage />} />

            {/* Agent pages */}
            <Route path="agent" element={<AgentLayout />}>
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="analytics" element={<AnalyticsPage />} />
                <Route path="revenue" element={<RevenueForecast />} />
                <Route path="brain" element={<AutonomousBrain />} />
                <Route path="inbox" element={<AIReviewInbox />} />
                <Route path="billing" element={<Billing />} />
                <Route path="playbooks" element={<Playbooks />} />
            </Route>

            {/* Admin pages */}
            <Route path="admin" element={<AdminLayout />}>
                <Route index element={<Navigate to="executive" replace />} />
                <Route path="executive" element={<ExecutiveDashboard />} />
                <Route path="analytics" element={<AdminAnalytics />} />
                <Route path="incidents" element={<IncidentCommandCenter />} />
            </Route>

            {/* Investor pages */}
            <Route path="investor" element={<InvestorLayout />}>
                <Route index element={<InvestorMode />} />
            </Route>

            {/* Fallback route */}
            <Route path="*" element={<Navigate to={ROUTES.home} replace />} />
        </Routes>
    );
}