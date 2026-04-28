import { Routes, Route, Navigate } from "react-router-dom";
import { useState } from "react";
import { Toaster } from "react-hot-toast";

// Components
import Navbar from "./components/Navbar.jsx";
import CareersPage from './components/CareersPage.jsx';
import ContactPage from "./components/ContactPage.jsx";
import ArchitecturePage from "./components/ArchitecturePage.jsx";
import Layout from "./components/Layout.jsx";
import ExecutionLogsStreamModal from "./components/ExecutionLogsStreamModal.jsx";
import DocsPage from "./components/DocsPage.jsx";
import SEOPillarPage from "./components/SEOPillarpage.jsx"; // New addition
import AuditPage from "./components/AuditPage.jsx"; // Found it!
import Dashboard from "./components/Dashboard.jsx";
import ExecutionList from "./components/ExecutionList.jsx";
import ExecutionDetail from "./components/ExecutionDetail.jsx";
import Subscription from "./components/Subscription.jsx";
import Goals from "./components/Goals.jsx";
import StreamPage from "./components/StreamPage.jsx"; // Integrated
import Login from "./components/Login.jsx";
import Register from "./components/Register.jsx";
import ForgotPassword from "./components/ForgotPassword.jsx";
import ResetPassword from "./components/ResetPassword.jsx";
import LandingPage from "./components/LandingPage.jsx";
import AdminDashboard from "./components/AdminDashboard.jsx";

// Logic & Providers
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import { lightTheme, darkTheme } from "./theme";
import { AuthProvider } from "./context/AuthProvider.jsx";
import { ToastProvider } from "./components/ToastContext.jsx";

export default function App() {
  const [isDark, setIsDark] = useState(true);
  const theme = isDark ? darkTheme : lightTheme;

  // This state powers the "Quick View" modal from any page
  const [selectedExecutionId, setSelectedExecutionId] = useState(null);

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
                background: '#0f172a',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.1)'
              }
            }} 
          />

          <Routes>
            {/* PUBLIC SECTOR */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/docs" element={<SEOPillarpage />} />
            <Route path="/architecture" element={<ArchitecturePage />} />
            <Route path="/careers" element={<CareersPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* PROTECTED SECTOR: OPERATIONAL SHELL */}
            <Route
              element={
                <ProtectedRoute allowed={["free", "pro", "enterprise", "admin"]}>
                  <Layout theme={theme} />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/goals" element={<Goals />} />
              <Route path="/subscription" element={<Subscription />} />
              
              {/* OPERATIONAL TRACING: PRO+ FEATURES */}
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

              {/* LIVE STREAM SECTOR */}
              <Route
                path="/stream/:executionId"
                element={
                  <ProtectedRoute allowed={["pro", "enterprise", "admin"]}>
                    <StreamPage />
                  </ProtectedRoute>
                }
              />

              {/* FORENSIC AUDIT SECTOR */}
              <Route
                path="/audit/:executionId"
                element={
                  <ProtectedRoute allowed={["pro", "enterprise", "admin"]}>
                    <AuditPage />
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* COMMAND SECTOR: ADMIN ONLY */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowed={["admin"]}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>

          {/* GLOBAL OVERLAYS */}
          {selectedExecutionId && (
            <ExecutionLogsStreamModal
              executionId={selectedExecutionId}
              onClose={() => setSelectedExecutionId(null)}
            />
          )}
        </div>
      </ToastProvider>
    </AuthProvider>
  );
}