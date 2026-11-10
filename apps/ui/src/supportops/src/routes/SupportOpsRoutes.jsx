import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import RequireRole from "../components/RequireRole";
import { RequireApp, RequireSignIn } from "../components/Access";

// Public Pages
import LandingPage from "../pages/LandingPage";
import LoginPage from "../pages/LoginPage";
import AdminRegisterPage from "../pages/AdminRegisterPage";
import PricingPage from "../pages/PricingPage";
import FeaturesPage from "../pages/FeaturesPage";
import PublicDemoPage from "../pages/PublicDemoPage";
import CancelPage from "../pages/CancelPage";
import SuccessPage from "../pages/SuccessPage";
import AuthPage from "../pages/AuthPage";
import SupportOpsOnboarding from "../pages/SupportOpsOnboarding";

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
import TeamPage from "../pages/TeamPage";
import Playbooks from "../pages/Playbooks";

// Admin Pages
import ExecutiveDashboard from "../pages/ExecutiveDashboard";
import AdminAnalytics from "../pages/AdminAnalytics";
import IncidentCommandCenter from "../pages/IncidentCommandCenter";
import ChannelsPage from "../pages/ChannelsPage";
import LiveChatPage from "../pages/LiveChatPage";
import TicketInboxPage from "../pages/TicketInboxPage";

// Investor Pages
import InvestorMode from "../pages/InvestorMode";

/**
 * SUPPORTOPS APPLICATION ROUTING
 *
 * APPLICATION PHILOSOPHY:
 *
 * 1. Public discovery comes first.
 * 2. Administrator authentication is the public entry point.
 * 3. Authentication is required only when entering protected areas.
 * 4. Administrators land in the Executive Dashboard.
 * 5. Agents and investors have separate protected workspaces.
 *
 * PUBLIC ROUTES:
 *
 * /supportops
 * /supportops/features
 * /supportops/demo
 * /supportops/pricing
 * /supportops/login
 * /supportops/register
 * /supportops/auth
 * /supportops/cancel
 * /supportops/success
 *
 * PROTECTED ROUTES:
 *
 * /supportops/admin/*
 * /supportops/agent/*
 * /supportops/investor/*
 */

export default function SupportOpsRoutes() {
    const publicHome = "/supportops";

    return (
        <Routes>

            {/* ================================================
                PUBLIC ROUTES
                No authentication required.
            ================================================= */}

            <Route
                index
                element={<LandingPage />}
            />

            <Route
                path="demo"
                element={<PublicDemoPage />}
            />

            <Route
                path="features"
                element={<FeaturesPage />}
            />

            <Route
                path="pricing"
                element={<PricingPage />}
            />

            {/* Administrator Login */}

            <Route
                path="login"
                element={<LoginPage />}
            />

            {/* Administrator Registration */}

            <Route
                path="register"
                element={<AdminRegisterPage />}
            />

            {/* Authentication Callback */}

            <Route
                path="auth"
                element={<AuthPage />}
            />

            {/* Payment / Subscription Pages */}

            <Route
                path="cancel"
                element={<CancelPage />}
            />

            <Route
                path="success"
                element={<SuccessPage />}
            />

            <Route
                path="onboarding"
                element={<SupportOpsOnboarding />}
            />

            {/* ================================================
                PROTECTED APPLICATION ROUTES

                Authentication is enforced only here.
            ================================================= */}

            <Route element={<RequireSignIn />}>
                <Route element={<RequireApp />}>

                    {/* ========================================
                        ADMIN WORKSPACE

                        Admin and management users.
                        Primary application entry point.
                    ======================================== */}

                    <Route
                        element={
                            <RequireRole
                                roles={["admin", "management"]}
                            />
                        }
                    >

                        <Route
                            path="admin"
                            element={<AdminLayout />}
                        >

                            {/* Default Admin Landing Page */}

                            <Route
                                index
                                element={
                                    <Navigate
                                        to="/supportops/admin/executive"
                                        replace
                                    />
                                }
                            />

                            {/* Executive Dashboard */}

                            <Route
                                path="executive"
                                element={<ExecutiveDashboard />}
                            />

                            {/* Admin Analytics */}

                            <Route
                                path="analytics"
                                element={<AdminAnalytics />}
                            />

                            {/* Incident Management */}

                            <Route
                                path="incidents"
                                element={<IncidentCommandCenter />}
                            />

                            {/* Channel Management
                                Restricted to administrators only.
                            */}

                            <Route
                                element={
                                    <RequireRole
                                        roles={["admin"]}
                                    />
                                }
                            >

                                <Route
                                    path="channels"
                                    element={<ChannelsPage />}
                                />

                            </Route>

                        </Route>

                    </Route>


                    {/* ========================================
                        AGENT WORKSPACE

                        Protected internal workspace.
                        No public agent registration.
                    ======================================== */}

                    <Route
                        element={
                            <RequireRole
                                roles={["agent", "user", "admin"]}
                            />
                        }
                    >

                        <Route
                            path="agent"
                            element={<AgentLayout />}
                        >

                            {/* Default Agent Dashboard */}

                            <Route
                                index
                                element={
                                    <Navigate
                                        to="/supportops/agent/dashboard"
                                        replace
                                    />
                                }
                            />

                            <Route
                                path="dashboard"
                                element={<Dashboard />}
                            />

                            <Route
                                path="analytics"
                                element={<AnalyticsPage />}
                            />

                            <Route
                                path="revenue"
                                element={<RevenueForecast />}
                            />

                            <Route
                                path="brain"
                                element={<AutonomousBrain />}
                            />

                            <Route
                                path="inbox"
                                element={<AIReviewInbox />}
                            />

                            <Route
                                path="tickets"
                                element={<TicketInboxPage />}
                            />

                            <Route
                                path="chats"
                                element={<LiveChatPage />}
                            />

                            <Route
                                path="billing"
                                element={<Billing />}
                            />

                            <Route
                                path="team"
                                element={<TeamPage />}
                            />

                            <Route
                                path="playbooks"
                                element={<Playbooks />}
                            />

                        </Route>

                    </Route>


                    {/* ========================================
                        INVESTOR WORKSPACE

                        Restricted investor access.
                    ======================================== */}

                    <Route
                        element={
                            <RequireRole
                                roles={["investor", "admin"]}
                            />
                        }
                    >

                        <Route
                            path="investor"
                            element={<InvestorLayout />}
                        >

                            <Route
                                index
                                element={<InvestorMode />}
                            />

                        </Route>

                    </Route>

                </Route>
            </Route>


            {/* ================================================
                UNKNOWN ROUTES

                Return visitors to public landing page.
            ================================================= */}

            <Route
                path="*"
                element={
                    <Navigate
                        to={publicHome}
                        replace
                    />
                }
            />

        </Routes>
    );
}
