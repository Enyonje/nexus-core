import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useState } from "react";
import { Toaster } from "react-hot-toast";
import { AnimatePresence, motion } from "framer-motion";

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

// Agent Components
import CrossBorderCompliance from "./components/CrossBorderCompliance.jsx";
import SupportOps from "./components/Support0ps.jsx";

// Logic & Providers
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import { lightTheme, darkTheme } from "./theme";
import AuthProvider from "./context/AuthProvider.jsx";   // ✅ default export, not destructured
import { ToastProvider } from "./components/ToastContext.jsx";

export default function App() {
  const [isDark, setIsDark] = useState(true);
  const theme = isDark ? darkTheme : lightTheme;

  const [selectedExecutionId, setSelectedExecutionId] = useState(null);
  const location = useLocation();

  return (
    <AuthProvider>
      <ToastProvider>
        <div
          className="transition-colors duration-300"
          style={{
            minHeight: "100vh",
            fontFamily: theme.typography.fontFamily,
            backgroundColor: theme.colors.background,
            color: theme.colors.text.primary,
          }}
        >
          <Navbar
            onToggleTheme={() => setIsDark(!isDark)}
            isDark={isDark}
            theme={theme}
          />

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

          {/* AnimatePresence for route transitions */}
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
            >
              <Routes location={location}>
                {/* PUBLIC SECTOR */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/docs" element={<SEOPillarPage />} />
                <Route path="/architecture" element={<ArchitecturePage />} />
                <Route path="/careers" element={<CareersPage />} />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/pricing" element={<PricingGrid />} />
                <Route path="/subscription" element={<Subscription />} />
                <Route path="/tools" element={<ToolsIndex />} />
                <Route path="/agents" element={<AgentsDirectory />} />

                {/* DIRECT COMPLIANCE DASHBOARD ACCESS */}
                <Route path="/compliance" element={<CrossBorderCompliance />} />
                <Route path="/agents/cross-border-compliance" element={<CrossBorderCompliance />} />

                {/* OTHER SPECIALISED AGENTS */}
                <Route path="/support-ops-ai" element={<SupportOps />} />
                <Route path="/agents/support-ops" element={<SupportOps />} />

                {/* TOOLS ROUTING */}
                <Route path="/tools/webhook-validator" element={<WebhookValidator />} />
                <Route path="/tools/auditloganalyzer" element={<AuditLogAnalyzer />} />

                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />

                {/* PROTECTED SECTOR */}
                <Route
                  element={
                    <ProtectedRoute allowed={["free", "pro", "enterprise", "admin"]}>
                      <Layout theme={theme} />
                    </ProtectedRoute>
                  }
                >
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/goals" element={<Goals />} />

                  {/* EXECUTIONS */}
                  <Route
                    path="/executions"
                    element={
                      <ProtectedRoute allowed={["pro", "enterprise", "admin"]}>
                        <ExecutionList setSelectedExecutionId={setSelectedExecutionId} />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/executions/:id"
                    element={
                      <ProtectedRoute allowed={["pro", "enterprise", "admin"]}>
                        <ExecutionDetail />
                      </ProtectedRoute>
                    }
                  />

                  {/* STREAMS */}
                  <Route
                    path="/executions/:executionId/stream"
                    element={
                      <ProtectedRoute allowed={["pro", "enterprise", "admin"]}>
                        <Streams />
                      </ProtectedRoute>
                    }
                  />

                  {/* AUDIT */}
                  <Route
                    path="/executions/:executionId/audit"
                    element={
                      <ProtectedRoute allowed={["pro", "enterprise", "admin"]}>
                        <Audit />
                      </ProtectedRoute>
                    }
                  />

                  {/* ADMIN */}
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

          {/* AnimatePresence for overlays/modals */}
          <AnimatePresence>
            {selectedExecutionId && (
              <ExecutionLogsStreamModal
                executionId={selectedExecutionId}
                onClose={() => setSelectedExecutionId(null)}
              />
            )}
          </AnimatePresence>
        </div>
      </ToastProvider>
    </AuthProvider>
  );
}
