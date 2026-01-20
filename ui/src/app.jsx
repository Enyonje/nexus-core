import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useState } from "react";

import Navbar from "./components/Navbar.jsx";
import Layout from "./components/Layout.jsx";
import Dashboard from "./components/Dashboard.jsx";
import ExecutionList from "./components/ExecutionList.jsx";
import ExecutionDetail from "./components/ExecutionDetail.jsx";
import Login from "./components/Login.jsx";
import Register from "./components/Register.jsx";
import Subscription from "./components/Subscription.jsx";
import ForgotPassword from "./components/ForgotPassword.jsx";
import ResetPassword from "./components/ResetPassword.jsx";
import { lightTheme, darkTheme } from "./theme";

export default function App() {
  const [isDark, setIsDark] = useState(false);
  const theme = isDark ? darkTheme : lightTheme;

  return (
    <Router>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100vh",
          fontFamily: theme.typography.fontFamily,
          backgroundColor: theme.colors.background,
          color: theme.colors.text.primary,
        }}
      >
        {/* Pass theme into Navbar */}
        <Navbar
          onToggleTheme={() => setIsDark(!isDark)}
          isDark={isDark}
          theme={theme}
        />

        {/* Pass theme into Layout */}
        <Layout theme={theme}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/executions" element={<ExecutionList />} />
            <Route path="/executions/:id" element={<ExecutionDetail />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/subscription" element={<Subscription />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            {/* Add more routes here: goals, audit, streams, settings */}
          </Routes>
        </Layout>
      </div>
    </Router>
  );
}