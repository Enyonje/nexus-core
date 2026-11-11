import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

// Route Guards
import RequireRole from "../components/RequireRole";
import {
    RequireApp,
    RequireSignIn,
} from "../components/Access";

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

// Unified Workspace Dashboard
import WorkspaceDashboard from "../pages/WorkspaceDashboard";

// Agent Pages
import AnalyticsPage from "../pages/AnalyticsPage";
import RevenueForecast from "../pages/RevenueForecast";
import AutonomousBrain from "../pages/AutonomousBrain";
import AIReviewInbox from "../pages/AIReviewInbox";
import Billing from "../pages/Billing";
import TeamPage from "../pages/TeamPage";
import Playbooks from "../pages/Playbooks";

// Admin Pages
import AdminAnalytics from "../pages/AdminAnalytics";
import IncidentCommandCenter from "../pages/IncidentCommandCenter";
import ChannelsPage from "../pages/ChannelsPage";
import LiveChatPage from "../pages/LiveChatPage";
import TicketInboxPage from "../pages/TicketInboxPage";

// Investor Pages
import InvestorMode from "../pages/InvestorMode";

/**
 * SUPPORTOPS ROUTING ARCHITECTURE
 *
 * Public:
 * /supportops
 * /supportops/demo
 * /supportops/features
 * /supportops/pricing
 * /supportops/login
 * /supportops/register
 * /supportops/auth
 * /supportops/cancel
 * /supportops/success
 * /supportops/onboarding
 *
 * Admin Command Center:
 * /supportops/admin (Defaults to Admin Executive Command Center)
 * /supportops/admin/executive
 * /supportops/admin/dashboard
 * /supportops/admin/analytics
 * /supportops/admin/incidents
 * /supportops/admin/channels
 *
 * Agent Workspace:
 * /supportops/agent (Defaults to Agent Priority Queue)
 * /supportops/agent/dashboard
 * /supportops/agent/analytics
 * /supportops/agent/revenue
 * /supportops/agent/brain
 * /supportops/agent/inbox
 * /supportops/agent/tickets
 * /supportops/agent/chats
 * /supportops/agent/billing
 * /supportops/agent/team
 * /supportops/agent/playbooks
 *
 * Investor Performance:
 * /supportops/investor
 */

export default function SupportOpsRoutes() {
    const publicHome = "/supportops";

    return (
        <Routes>
            {/* ---------------------------------------------------- */}
            {/* 1. PUBLIC ROUTES (No Authentication Required)        */}
            {/* ---------------------------------------------------- */}
            <Route index element={<LandingPage />} />
            <Route path="demo" element={<PublicDemoPage />} />
            <Route path="features" element={<FeaturesPage />} />
            <Route path="pricing" element={<PricingPage />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="register" element={<AdminRegisterPage />} />
            <Route path="auth" element={<AuthPage />} />
            <Route path="cancel" element={<CancelPage />} />
            <Route path="success" element={<SuccessPage />} />
            <Route path="onboarding" element={<SupportOpsOnboarding />} />

            {/* ---------------------------------------------------- */}
            {/* 2. PROTECTED APPLICATION ROUTES                       */}
            {/* ---------------------------------------------------- */}
            <Route element={<RequireSignIn />}>
                <Route element={<RequireApp />}>

                    {/* ADMIN & MANAGEMENT WORKSPACE */}
                    <Route
                        element={
                            <RequireRole roles={["admin", "management"]} />
                        }
                    >
                        <Route path="admin" element={<AdminLayout />}>
                            {/* Default admin root to full Executive Command Center */}
                            <Route
                                index
                                element={
                                    <WorkspaceDashboard
                                        view="admin"
                                        role="admin"
                                    />
                                }
                            />

                            <Route
                                path="executive"
                                element={
                                    <WorkspaceDashboard
                                        view="admin"
                                        role="admin"
                                    />
                                }
                            />

                            <Route
                                path="dashboard"
                                element={
                                    <WorkspaceDashboard
                                        view="admin"
                                        role="admin"
                                    />
                                }
                            />

                            <Route
                                path="analytics"
                                element={<AdminAnalytics />}
                            />

                            <Route
                                path="incidents"
                                element={<IncidentCommandCenter />}
                            />

                            {/* Integrations & Channel Management */}
                            <Route
                                element={<RequireRole roles={["admin"]} />}
                            >
                                <Route
                                    path="channels"
                                    element={<ChannelsPage />}
                                />
                            </Route>
                        </Route>
                    </Route>

                    {/* AGENT WORKSPACE */}
                    <Route
                        element={
                            <RequireRole roles={["agent", "user", "admin"]} />
                        }
                    >
                        <Route path="agent" element={<AgentLayout />}>
                            <Route
                                index
                                element={<Navigate to="dashboard" replace />}
                            />

                            <Route
                                path="dashboard"
                                element={
                                    <WorkspaceDashboard
                                        view="agent"
                                        role="agent"
                                    />
                                }
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

                    {/* INVESTOR WORKSPACE */}
                    <Route
                        element={
                            <RequireRole roles={["investor", "admin"]} />
                        }
                    >
                        <Route path="investor" element={<InvestorLayout />}>
                            <Route
                                index
                                element={
                                    <WorkspaceDashboard
                                        view="investor"
                                        role="investor"
                                    />
                                }
                            />
                            <Route
                                path="mode"
                                element={<InvestorMode />}
                            />
                        </Route>
                    </Route>

                </Route>
            </Route>

            {/* ---------------------------------------------------- */}
            {/* 3. CATCH-ALL FALLBACK                                */}
            {/* ---------------------------------------------------- */}
            <Route
                path="*"
                element={<Navigate to={publicHome} replace />}
            />
        </Routes>
    );
}