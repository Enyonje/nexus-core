import { Routes, Route, Link, Navigate, useLocation, useParams } from "react-router-dom";
import { useState } from "react";
import { Toaster } from "react-hot-toast";
import { AnimatePresence, motion } from "framer-motion";

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
import AgentDetail from "./components/AgentDetail.jsx";
import SupportOpsRoutes from "./supportops/src/routes/SupportOpsRoutes.jsx";
import CrossBorderCompliance from "./components/CrossBorderCompliance.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import PricingPage from "./components/billing/PricingPage.jsx";
import BillingPage from "./components/billing/BillingPage.jsx";
import ProductAuthPage from "./components/auth/ProductAuthPage.jsx";
import ComplianceLayout from "./components/compliance/ComplianceLayout.jsx";
import { ComplianceAuthProvider, RequireComplianceAuth, useComplianceAuth } from "./context/ComplianceAuth.jsx";
import { useAuth } from "./hooks/useAuth";

import { lightTheme, darkTheme } from "./theme";

// Pages inside the workspace layout share one animation key so the layout and guard stay mounted.
const WORKSPACE_PREFIXES = ["/dashboard", "/goals", "/executions", "/admin", "/billing"];
// Pages that draw their own full-screen chrome and must not get the marketing navbar on top
// (it used to push the sign-in card ~500px down the page).
const NO_NAVBAR = ["/", "/agents", "/login", "/register", "/forgot-password", "/reset-password"];
const NO_NAVBAR_PREFIXES = ["/compliance", "/agents/"];

/*function SupportOpsRedirect() {
  const location = useLocation();
  useEffect(() => {
    window.location.replace(`https://supportops.nexusthecore.com${location.pathname}${location.search}${location.hash}`);
  }, [location.pathname, location.search, location.hash]);
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-6 text-slate-200">
      <p>Opening SupportOps…</p>
    </div>
  );
}*/

/** /agent and /agent/<slug> are common typos for the agent platform; send them to /agents. */
function AgentAlias() {
  const { "*": rest } = useParams();
  return <Navigate to={rest ? `/agents/${rest}` : "/agents"} replace />;
}

function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6 text-slate-200">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white">Page not found</h1>
        <p className="mt-3 text-sm text-slate-400">That address does not exist or has moved.</p>
        <div className="mt-6 flex justify-center gap-4 text-sm">
          <Link to="/" className="text-cyan-400 hover:underline">Homepage</Link>
          <Link to="/agents" className="text-cyan-400 hover:underline">Agents</Link>
          <Link to="/pricing" className="text-cyan-400 hover:underline">Pricing</Link>
        </div>
      </div>
    </div>
  );
}

/** Compliance routes get their own sign-in provider, mounted only while on /compliance. */
function ComplianceShell() {
  return (
    <ComplianceAuthProvider>
      <ComplianceLayout />
    </ComplianceAuthProvider>
  );
}

export default function App() {
  const [isDark, setIsDark] = useState(true);
  const [selectedExecutionId, setSelectedExecutionId] = useState(null);
  const location = useLocation();
  const theme = isDark ? darkTheme : lightTheme;

  const showNavbar = !NO_NAVBAR.includes(location.pathname) && !NO_NAVBAR_PREFIXES.some((p) => location.pathname.startsWith(p));
  const inWorkspace = WORKSPACE_PREFIXES.some((p) => location.pathname === p || location.pathname.startsWith(`${p}/`));
  const inCompliance = location.pathname === "/compliance" || location.pathname.startsWith("/compliance/");
  const inSupportOps = location.pathname === "/supportops" || location.pathname.startsWith("/supportops/");
  const animationKey = inWorkspace
    ? "workspace"
    : inCompliance
      ? "compliance"
      : inSupportOps
        ? "supportops"
        : location.pathname;

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
      {showNavbar && <Navbar onToggleTheme={() => setIsDark((prev) => !prev)} isDark={isDark} theme={theme} />}

      <Toaster position="top-right" toastOptions={{ style: { background: "#0f172a", color: "#fff", border: "1px solid rgba(255,255,255,0.1)" } }} />

      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={animationKey} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }}>
          <Routes location={location}>
            {/* ================= PUBLIC ================= */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/docs" element={<SEOPillarPage />} />
            <Route path="/ai-agents" element={<SEOPillarPage />} />
            <Route path="/workflow-automation" element={<SEOPillarPage />} />
            <Route path="/architecture" element={<ArchitecturePage />} />
            <Route path="/careers" element={<CareersPage />} />
            <Route path="/blog" element={<BlogPage />} />
            <Route path="/blog/:slug" element={<BlogPage />} />
            <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
            <Route path="/terms-of-service" element={<TermsOfServicePage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/pricing" element={<PricingPage product="nexus-core" useProductAuth={useAuth} />} />

            {/* Agent platform: one manifest file per agent in src/agents/registry */}
            <Route path="/agents" element={<AgentsDirectory />} />
            <Route path="/agents/:slug" element={<AgentDetail />} />
            <Route path="/agent/*" element={<AgentAlias />} />

            {/* Nexus Core sign-in */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Free public tools */}
            <Route path="/tools" element={<ToolsIndex />} />
            <Route path="/tools/webhook-validator" element={<WebhookValidator />} />
            <Route path="/tools/auditloganalyzer" element={<AuditLogAnalyzer />} />

            {/* Old URLs */}
            <Route path="/subscription" element={<Navigate to="/billing" replace />} />
            <Route path="/upgrade" element={<Navigate to="/pricing" replace />} />
            <Route path="/crossborder/*" element={<Navigate to="/compliance" replace />} />
            <Route path="/supportops/*" element={<SupportOpsRoutes />} />

            {/* ================= CROSS-BORDER COMPLIANCE (its own sign-in) ================= */}
            <Route path="/compliance" element={<ComplianceShell />}>
              <Route path="login" element={<ProductAuthPage product="compliance" mode="login" useProductAuth={useComplianceAuth} />} />
              <Route path="register" element={<ProductAuthPage product="compliance" mode="register" useProductAuth={useComplianceAuth} />} />
              <Route path="forgot-password" element={<ProductAuthPage product="compliance" mode="forgot" useProductAuth={useComplianceAuth} />} />
              <Route path="reset-password" element={<ProductAuthPage product="compliance" mode="reset" useProductAuth={useComplianceAuth} />} />
              <Route path="pricing" element={<PricingPage product="compliance" useProductAuth={useComplianceAuth} />} />
              <Route element={<RequireComplianceAuth />}>
                <Route index element={<CrossBorderCompliance />} />
                <Route path="billing" element={<BillingPage product="compliance" useProductAuth={useComplianceAuth} />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Route>

            {/* ================= NEXUS CORE WORKSPACE (sign-in required) ================= */}
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout theme={theme} />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/goals" element={<Goals />} />
                <Route path="/billing" element={<BillingPage product="nexus-core" useProductAuth={useAuth} />} />

                <Route element={<ProtectedRoute requiredTier="pro" />}>
                  <Route path="/executions" element={<ExecutionList setSelectedExecutionId={setSelectedExecutionId} />} />
                  <Route path="/executions/:id" element={<ExecutionDetail />} />
                  <Route path="/executions/:executionId/stream" element={<Streams />} />
                  <Route path="/executions/:executionId/audit" element={<Audit />} />
                </Route>

                <Route element={<ProtectedRoute requiredRole="admin" />}>
                  <Route path="/admin" element={<AdminDashboard />} />
                </Route>
              </Route>
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {selectedExecutionId ? (
          <ExecutionLogsStreamModal key={selectedExecutionId} executionId={selectedExecutionId} onClose={() => setSelectedExecutionId(null)} />
        ) : null}
      </AnimatePresence>
    </div>
  );
}
