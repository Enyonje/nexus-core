import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import { ROUTES } from "../config/paths";
import RequireRole from "../components/RequireRole";
import { RequireApp, RequireSignIn } from "../components/Access";

// Public pages
import LandingPage from "../pages/LandingPage";
import LoginPage from "../pages/LoginPage";
import PricingPage from "../pages/PricingPage";
import FeaturesPage from "../pages/FeaturesPage";
import CancelPage from "../pages/CancelPage";
import SuccessPage from "../pages/SuccessPage";
import AuthPage from "../pages/AuthPage";
import JoinPage from "../pages/JoinPage";

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
import TeamPage from "../pages/TeamPage";
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
 * SupportOps routes.
 *
 * PUBLIC:
 *   /supportops
 *   /supportops/features
 *   /supportops/pricing
 *   /supportops/login
 *   /supportops/auth
 *   /supportops/cancel
 *   /supportops/success
 *
 * PROTECTED:
 *   /supportops/agent/*
 *   /supportops/admin/*
 *   /supportops/investor/*
 *
 * IMPORTANT:
 * The parent application must NOT put the entire SupportOps route
 * tree behind a sign-in gate. Authentication is enforced only on
 * the protected routes below.
 */
export default function SupportOpsRoutes() {
    const publicHome = "/supportops";

    return (
        <Routes>
            {/* =====================================================
          PUBLIC ROUTES
          These pages must be accessible without signing in.
         ===================================================== */}

            <Route index element={<LandingPage />} />

            <Route
                path="features"
                element={<FeaturesPage />}
            />

            <Route
                path="pricing"
                element={<PricingPage />}
            />

            <Route
                path="login"
                element={<LoginPage />}
            />

            <Route
                path="auth"
                element={<AuthPage />}
            />

            <Route
                path="cancel"
                element={<CancelPage />}
            />

            <Route
                path="success"
                element={<SuccessPage />}
            />

            {/* =====================================================
          PROTECTED ROUTES
          Authentication and subscription checks apply here.
         ===================================================== */}

            <Route element={<RequireSignIn />}>
                <Route element={<RequireApp />}>
                    {/* -------------------------------------------------
              AGENT WORKSPACE
              /supportops/agent/*
             ------------------------------------------------- */}

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
                            <Route
                                index
                                element={
                                    <Navigate
                                        to="dashboard"
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
                                path="join"
                                element={<JoinPage />}
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

                    {/* -------------------------------------------------
              ADMIN WORKSPACE
              /supportops/admin/*
             ------------------------------------------------- */}

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
                            <Route
                                index
                                element={
                                    <Navigate
                                        to="executive"
                                        replace
                                    />
                                }
                            />

                            <Route
                                path="executive"
                                element={<ExecutiveDashboard />}
                            />

                            <Route
                                path="analytics"
                                element={<AdminAnalytics />}
                            />

                            <Route
                                path="incidents"
                                element={<IncidentCommandCenter />}
                            />

                            {/* Only administrators can access channels. */}
                            <Route
                                element={
                                    <RequireRole roles={["admin"]} />
                                }
                            >
                                <Route
                                    path="channels"
                                    element={<ChannelsPage />}
                                />
                            </Route>
                        </Route>
                    </Route>

                    {/* -------------------------------------------------
              INVESTOR WORKSPACE
              /supportops/investor/*
             ------------------------------------------------- */}

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

            {/* =====================================================
          UNKNOWN ROUTES
          Return visitors to the public landing page.
         ===================================================== */}

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