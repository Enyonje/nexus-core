import { Routes, Route, Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { Toaster } from "react-hot-toast";
import { AnimatePresence, motion } from "framer-motion";


// Components
import Navbar from "./components/Navbar.jsx";
import CareersPage from "./components/CareersPage.jsx";
import ContactPage from "./components/ContactPage.jsx";
import TermsOfServicePage from "./components/TermsOfService.jsx";
import PrivacyPolicyPage from "./components/PrivacyPolicy.jsx";
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
import BlogPage from "./components/BlogPage.jsx";
import ForgotPassword from "./components/ForgotPassword.jsx";
import ResetPassword from "./components/ResetPassword.jsx";
import LandingPage from "./components/LandingPage.jsx";
import AdminDashboard from "./components/AdminDashboard.jsx";
import AuditLogAnalyzer from "./components/AuditLogAnalyzer";
import AgentsDirectory from "./components/AgentsDirectory.jsx";
import CrossBorderCompliance from "./components/CrossBorderCompliance.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

import { lightTheme, darkTheme } from "./theme";

// Pages that sit inside the workspace layout. They share one animation key so the layout and the auth
// guard stay mounted while the user moves between them (a per-path key remounts both on every click).
const WORKSPACE_PREFIXES = ["/dashboard", "/goals", "/executions", "/admin"];

function SupportOpsRedirect() {
  const location = useLocation();
  useEffect(() => {
    const destination = `https://supportops.nexusthecore.com${location.pathname}${location.search}${location.hash}`;
    window.location.replace(destination);
  }, [location.pathname, location.search, location.hash]);
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-6 text-slate-200">
      <p>Opening SupportOps…</p>
    </div>
  );
}

function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6 text-slate-200">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white">Page not found</h1>
        <p className="mt-3 text-sm text-slate-400">That address does not exist or has moved.</p>
        <Link to="/" className="mt-6 inline-block text-sm text-cyan-400 hover:underline">
          Go to the homepage
        </Link>
      </div>
    </div>
  );
}

/**
 * NOTE: BrowserRouter, AuthProvider and ToastProvider are already supplied by
 * main.jsx. Do NOT wrap them again here, or you get duplicate auth state.
 */
export default function App() {
  const [isDark, setIsDark] = useState(true);
  const [selectedExecutionId, setSelectedExecutionId] = useState(null);

  const location = useLocation();
  const theme = isDark ? darkTheme : lightTheme;

  const hideNavbarRoutes = ["/", "/agents"];
  const showNavbar = !hideNavbarRoutes.includes(location.pathname);

  const inWorkspace = WORKSPACE_PREFIXES.some(
    (p) => location.pathname === p || location.pathname.startsWith(`${p}/`)
  );
  const animationKey = inWorkspace ? "workspace" : location.pathname;

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
        <Navbar onToggleTheme={() => setIsDark((prev) => !prev)} isDark={isDark} theme={theme} />
      )}

      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: "#0f172a", color: "#fff", border: "1px solid rgba(255,255,255,0.1)" },
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
            {/* ================= PUBLIC: never ask for authentication ================= */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/docs" element={<SEOPillarPage />} />
            <Route path="/ai-agents" element={<SEOPillarPage />} />
            <Route path="/workflow-automation" element={<SEOPillarPage />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/goals" element={<Goals />} />
            <Route path="/architecture" element={<ArchitecturePage />} />
            <Route path="/careers" element={<CareersPage />} />
            <Route path="/blog" element={<BlogPage />} />
            <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
            <Route path="/terms-of-service" element={<TermsOfServicePage />} />
            <Route path="/blog/:slug" element={<BlogPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/pricing" element={<Subscription />} />
            <Route path="/agents" element={<AgentsDirectory />} />
            <Route path="/compliance" element={<CrossBorderCompliance />} />
            <Route path="/agents/cross-border-compliance" element={<CrossBorderCompliance />} />

            {/* Sign-in flow */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Free public tools */}
            <Route path="/tools" element={<ToolsIndex />} />
            <Route path="/tools/webhook-validator" element={<WebhookValidator />} />
            <Route path="/tools/auditloganalyzer" element={<AuditLogAnalyzer />} />

            {/* Legacy SupportOps URLs now hand off to the independently hosted application. */}
            <Route path="/supportops/*" element={<SupportOpsRedirect />} />

            {/* ================= PROTECTED: sign-in required ================= */}
            <Route element={<ProtectedRoute />}>
              <Route path="/subscription" element={<Subscription />} />

              <Route element={<Layout theme={theme} />}>



                {/* Paid tier */}
                <Route element={<ProtectedRoute requiredTier="pro" />}>
                  <Route
                    path="/executions"
                    element={<ExecutionList setSelectedExecutionId={setSelectedExecutionId} />}
                  />
                  <Route path="/executions/:id" element={<ExecutionDetail />} />
                  <Route path="/executions/:executionId/stream" element={<Streams />} />
                  <Route path="/executions/:executionId/audit" element={<Audit />} />
                </Route>

                {/* Admins only */}
                <Route element={<ProtectedRoute requiredRole="admin" />}>
                  <Route path="/admin" element={<AdminDashboard />} />
                </Route>
              </Route>
            </Route>

            {/* Not found page */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </motion.div>
      </AnimatePresence>

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