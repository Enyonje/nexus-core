import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useState } from "react";
import { Toaster } from "react-hot-toast";
import { AnimatePresence, motion } from "framer-motion";

// SupportOps (separate project embedded in this app, with its own auth context)
import SupportOpsRoutes from "./supportops/src/routes/SupportOpsRoutes";

// Components
import Navbar from "./components/Navbar.jsx";
import CareersPage from "./components/CareersPage.jsx";
import ContactPage from "./components/ContactPage.jsx";
import ArchitecturePage from "./components/ArchitecturePage.jsx";
import Layout from "./components/Layout.jsx";
import ExecutionLogsStreamModal from "./components/ExecutionLogsStreamModal.jsx";
import SEOPillarPage from "./components/SEOPillarPage.jsx";
import ToolsIndex from "./components/ToolsIndex";
import Audit from "./components/Audit.jsx";
import WebhookValidator from "./components/WebhookValidator.jsx";
import Dashboard from "./components/Dashboard.jsx";
import ExecutionList from "./components/ExecutionList.jsx";
import ExecutionDetail from "./components/ExecutionDetail.jsx";
import Subscription from "./components/Subscription.jsx";
import { PricingGrid } from "./components/PricingGrid.jsx";
import Goals from "./components/Goals.jsx";
import Streams from "./components/Streams.jsx";
import Login from "./components/Login.jsx";
import Register from "./components/Register.jsx";
import ForgotPassword from "./components/ForgotPassword.jsx";
import ResetPassword from "./components/ResetPassword.jsx";
import LandingPage from "./components/LandingPage.jsx";
import AdminDashboard from "./components/AdminDashboard.jsx";
import AuditLogAnalyzer from "./components/AuditLogAnalyzer";
import AgentsDirectory from "./components/AgentsDirectory.jsx";
import CrossBorderCompliance from "./components/CrossBorderCompliance.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

import { lightTheme, darkTheme } from "./theme";

/**
 * NOTE: BrowserRouter, AuthProvider and ToastProvider are already supplied by
 * main.jsx. Do NOT wrap them again here, or you get duplicate auth state.
 */
export default function App() {
  const [isDark, setIsDark] = useState(true);
  const [selectedExecutionId, setSelectedExecutionId] = useState(null);

  const location = useLocation();

  // Dynamically resolve theme based on state
  const theme = isDark ? darkTheme : lightTheme;

  // Specify routes where the top Navbar should NOT render
  const hideNavbarRoutes = ["/", "/agents"];
  const isSupportOps = location.pathname.startsWith("/supportops");
  const showNavbar = !isSupportOps && !hideNavbarRoutes.includes(location.pathname);

  // Key for page transition animation
  const animationKey = location.pathname;

  return (
    <div
      className="transition-colors duration-300"
      style={{
        minHeight: "100vh",
        fontFamily: theme.typography?.fontFamily || "sans-serif",
        backgroundColor: theme.colors?.background || "#0f172a",
        color: theme.colors?.text?.primary || "#ffffff",
      }}
    >
      {showNavbar && (
        <Navbar
          onToggleTheme={() => setIsDark((prev) => !prev)}
          isDark={isDark}
          theme={theme}
        />
      )}

      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#0f172a",
            color: "#fff",
            border: "1px solid rgba(255,255,255,0.1)",
          },
        }}
      />

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={animationKey}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15 }}
        >
          <Routes location={location}>
            {/* PUBLIC ROUTES */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/docs" element={<SEOPillarPage />} />
            <Route path="/architecture" element={<ArchitecturePage />} />
            <Route path="/careers" element={<CareersPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/pricing" element={<PricingGrid />} />
            <Route path="/subscription" element={<Subscription />} />
            <Route path="/agents" element={<AgentsDirectory />} />

            {/* COMPLIANCE */}
            <Route path="/compliance" element={<CrossBorderCompliance />} />
            <Route
              path="/agents/cross-border-compliance"
              element={<CrossBorderCompliance />}
            />

            {/* TOOLS */}
            <Route path="/tools" element={<ToolsIndex />} />
            <Route path="/tools/webhook-validator" element={<WebhookValidator />} />
            <Route path="/tools/auditloganalyzer" element={<AuditLogAnalyzer />} />

            {/* SUPPORTOPS EMBEDDED MODULE */}
            <Route
              path="/supportops/*"
              element={<SupportOpsRoutes />}
            />

            {/* PROTECTED MAIN APP ROUTES */}
            <Route
              element={
                <ProtectedRoute allowed={["free", "pro", "enterprise", "admin"]}>
                  <Layout theme={theme} />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/goals" element={<Goals />} />
              <Route
                path="/executions"
                element={<ExecutionList setSelectedExecutionId={setSelectedExecutionId} />}
              />
              <Route path="/executions/:id" element={<ExecutionDetail />} />
              <Route path="/executions/:executionId/stream" element={<Streams />} />
              <Route path="/executions/:executionId/audit" element={<Audit />} />

              {/* ADMIN ONLY */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowed={["admin"]}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </motion.div>
      </AnimatePresence>

      {/* Execution log modal */}
      <AnimatePresence>
        {selectedExecutionId ? (
          <ExecutionLogsStreamModal
            key={selectedExecutionId}
            executionId={selectedExecutionId}
            onClose={() => setSelectedExecutionId(null)}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}