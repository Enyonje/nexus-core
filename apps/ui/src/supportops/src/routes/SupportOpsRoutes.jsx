import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import { ROUTES } from "../config/paths";
import RequireRole from "../components/RequireRole";

// Public pages
import LandingPage from "../pages/LandingPage";
import LoginPage from "../pages/LoginPage";
import PricingPage from "../pages/PricingPage";
import { RequireApp, RequireSignIn } from "../components/Access";
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
import AuthPage from "../pages/AuthPage";
import Playbooks from "../pages/Playbooks";



// Admin pages
import ExecutiveDashboard from "../pages/ExecutiveDashboard";
import AdminAnalytics from "../pages/AdminAnalytics";
import IncidentCommandCenter from "../pages/IncidentCommandCenter";
import ChannelsPage from "../pages/ChannelsPage";
import LiveChatPage from "../pages/LiveChatPage";
import TicketInboxPage from "../pages/TicketInboxPage";

// Investor pages
import InvestorMode from "../pages/InvestorMode";

/**
 * Mounted by the main app at <Route path="/supportops/*" />, inside the main app's sign-in gate.
 * SupportOps does no authentication. Paths below are RELATIVE to /supportops.
 */
export default function SupportOpsRoutes() {
    return (
        <Routes>
            {/* Marketing pages: /supportops, /supportops/features, ... */}
            <Route index element={<LandingPage />} />
            <Route path="features" element={<FeaturesPage />} />
            <Route path="cancel" element={<CancelPage />} />
            <Route path="success" element={<SuccessPage />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="auth" element={<AuthPage />} />
            <Route path="pricing" element={<PricingPage />} />

            {/* Everything below needs an active SupportOps subscription or trial */}
            <Route element={<RequireSignIn />}>
                <Route element={<RequireApp />}>
                    {/* Agent: /supportops/agent/* */}
                    <Route element={<RequireRole roles={["agent", "user", "admin"]} />}>
                        <Route path="agent" element={<AgentLayout />}>
                            <Route index element={<Navigate to="dashboard" replace />} />
                            <Route path="dashboard" element={<Dashboard />} />
                            <Route path="analytics" element={<AnalyticsPage />} />
                            <Route path="revenue" element={<RevenueForecast />} />
                            <Route path="brain" element={<AutonomousBrain />} />
                            <Route path="inbox" element={<AIReviewInbox />} />
                            <Route path="tickets" element={<TicketInboxPage />} />
                            <Route path="chats" element={<LiveChatPage />} />
                            <Route path="billing" element={<Billing />} />
                            <Route path="playbooks" element={<Playbooks />} />
                        </Route>
                    </Route>

                    {/* Admin: /supportops/admin/* */}
                    <Route element={<RequireRole roles={["admin", "management"]} />}>
                        <Route path="admin" element={<AdminLayout />}>
                            <Route index element={<Navigate to="executive" replace />} />
                            <Route path="executive" element={<ExecutiveDashboard />} />
                            <Route path="analytics" element={<AdminAnalytics />} />
                            <Route path="incidents" element={<IncidentCommandCenter />} />
                            <Route element={<RequireRole roles={["admin"]} />}>
                                <Route path="channels" element={<ChannelsPage />} />
                            </Route>
                        </Route>
                    </Route>

                    {/* Investor: /supportops/investor */}
                    <Route element={<RequireRole roles={["investor", "admin"]} />}>
                        <Route path="investor" element={<InvestorLayout />}>
                            <Route index element={<InvestorMode />} />
                        </Route>
                    </Route>

                </Route>
            </Route>

            {/* Anything else stays inside SupportOps */}
            <Route path="*" element={<Navigate to={ROUTES.home} replace />} />
        </Routes>
    );
}