import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./routes/ProtectedRoute";

// Public
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import FeaturesPage from "./pages/FeaturesPage";
import CancelPage from "./pages/CancelPage";
import SuccessPage from "./pages/SuccessPage";

// Layouts
import AgentLayout from "./layouts/AgentLayout";
import AdminLayout from "./layouts/AdminLayout";
import InvestorLayout from "./layouts/InvestorLayout";

// Agent
import Dashboard from "./pages/Dashboard";
import AnalyticsPage from "./pages/AnalyticsPage";
import RevenueForecast from "./pages/RevenueForecast";
import AutonomousBrain from "./pages/AutonomousBrain";
import AIReviewInbox from "./pages/AIReviewInbox";
import Billing from "./pages/Billing";
import Playbooks from "./pages/Playbooks";

// Admin
import ExecutiveDashboard from "./pages/ExecutiveDashboard";
import AdminAnalytics from "./pages/AdminAnalytics";
import IncidentCommandCenter from "./pages/IncidentCommandCenter";

// Investor
import InvestorMode from "./pages/InvestorMode";

export default function App() {
  return (
    <Routes>
      {/* 🌐 Public */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/features" element={<FeaturesPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/cancel" element={<CancelPage />} />
      <Route path="/success" element={<SuccessPage />} />

      {/* 🧑‍💼 Agent */}
      <Route element={<ProtectedRoute allowRoles={["agent"]} />}>
        <Route path="/agent" element={<AgentLayout />}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="revenue" element={<RevenueForecast />} />
          <Route path="brain" element={<AutonomousBrain />} />
          <Route path="inbox" element={<AIReviewInbox />} />
          <Route path="billing" element={<Billing />} />
          <Route path="playbooks" element={<Playbooks />} />
        </Route>
      </Route>

      {/* 🛡 Admin */}
      <Route element={<ProtectedRoute allowRoles={["admin", "management"]} />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route path="executive" element={<ExecutiveDashboard />} />
          <Route path="analytics" element={<AdminAnalytics />} />
          <Route path="incidents" element={<IncidentCommandCenter />} />
        </Route>
      </Route>

      {/* 💰 Investor */}
      <Route element={<ProtectedRoute allowRoles={["investor"]} />}>
        <Route path="/investor" element={<InvestorLayout />}>
          <Route index element={<InvestorMode />} />
        </Route>
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
