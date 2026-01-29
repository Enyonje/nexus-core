import { Routes, Route } from "react-router-dom";
import { useState } from "react";

import Navbar from "./components/Navbar.jsx";
import Layout from "./components/Layout.jsx";
import Dashboard from "./components/Dashboard.jsx";
import ExecutionList from "./components/ExecutionList.jsx";
import ExecutionDetail from "./components/ExecutionDetail.jsx";
import Subscription from "./components/Subscription.jsx";
import Goals from "./components/Goals.jsx";

import Login from "./components/Login.jsx";
import Register from "./components/Register.jsx";
import ForgotPassword from "./components/ForgotPassword.jsx";
import ResetPassword from "./components/ResetPassword.jsx";
import LandingPage from "./components/LandingPage.jsx";

import ProtectedRoute from "./components/ProtectedRoute.jsx";
import { lightTheme, darkTheme } from "./theme";
import { AuthProvider } from "./context/AuthProvider.jsx";

export default function App() {
  const [isDark, setIsDark] = useState(false);
  const theme = isDark ? darkTheme : lightTheme;

  return (
    <AuthProvider>
      <div
        style={{
          minHeight: "100vh",
          fontFamily: theme.typography.fontFamily,
          backgroundColor: theme.colors.background,
          color: theme.colors.text.primary,
        }}
      >
        {/* Navbar is global */}
        <Navbar
          onToggleTheme={() => setIsDark(!isDark)}
          isDark={isDark}
          theme={theme}
        />

        <Routes>
          {/* =======================
              PUBLIC ROUTES
          ======================= */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* =======================
              PROTECTED APP SHELL
          ======================= */}
          <Route
            element={
              <ProtectedRoute allowed={["free", "pro", "enterprise"]}>
                <Layout theme={theme} />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />

            {/* FREE: goals + limited execution */}
            <Route path="/goals" element={<Goals />} />

            {/* PRO & ENTERPRISE */}
            <Route
              path="/executions"
              element={
                <ProtectedRoute allowed={["pro", "enterprise"]}>
                  <ExecutionList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/executions/:id"
              element={
                <ProtectedRoute allowed={["pro", "enterprise"]}>
                  <ExecutionDetail />
                </ProtectedRoute>
              }
            />

            {/* Subscription must be logged-in */}
            <Route path="/subscription" element={<Subscription />} />
          </Route>

          {/* =======================
              FALLBACK
          ======================= */}
          <Route path="*" element={<LandingPage />} />
        </Routes>
      </div>
    </AuthProvider>
  );
}
