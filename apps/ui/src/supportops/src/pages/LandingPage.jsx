import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap,
  LayoutDashboard,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  TrendingUp,
  ShieldCheck,
  Bot,
  MessageSquare,
  Users,
  BarChart3,
  Globe,
  LogIn,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useApp } from "../../../context/AccessProvider";
import { rememberReturn } from "../components/Access";
import { ROUTES, homeForRole } from "../config/paths";

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState("inbox");
  const { isAuth, loading, role } = useAuth();
  const plan = useApp("supportops");
  const navigate = useNavigate();

  const busy = loading || plan.loading;

  // Smooth scroll handler for anchor links
  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Where each kind of visitor should go:
  //  - signed out            -> sign up, then (via rememberReturn) back into SupportOps
  //  - signed in, no plan    -> pricing (the 14-day trial lives there)
  //  - signed in, has a plan -> the dashboard for their role
  const handleLaunchClick = (e) => {
    if (e) e.preventDefault();
    if (busy) return;

    if (!isAuth) {
      rememberReturn(ROUTES.agent.dashboard);
      navigate(ROUTES.signup);
      return;
    }
    navigate(plan.subscribed ? homeForRole(role) : ROUTES.pricing);
  };

  const goLogin = () => {
    rememberReturn(ROUTES.agent.dashboard);
    navigate(ROUTES.login);
  };

  const ctaLabel = busy
    ? "Checking Session…"
    : !isAuth
      ? "Start Free Trial"
      : plan.subscribed
        ? "Open Dashboard"
        : "Choose a Plan";

  const featureTabs = [
    {
      id: "inbox",
      label: "Unified Agent Inbox",
      icon: MessageSquare,
      title: "Omnichannel Customer Support Hub",
      description:
        "Manage tickets, live chat, and automated conversations across channels in one real-time workspace.",
      highlights: [
        "Real-time WebSocket event updates",
        "Contextual AI auto-responses",
        "Role-based agent assignment",
      ],
    },
    {
      id: "automation",
      label: "AI Automation Workflows",
      icon: Bot,
      title: "Agentic Task Orchestration",
      description:
        "Automate repetitive support tasks, triage incoming leads, and trigger background workflows seamlessly.",
      highlights: [
        "Temporal-backed workflow orchestration",
        "Custom triage & escalation rules",
        "Zero-latency automated routing",
      ],
    },
    {
      id: "analytics",
      label: "Performance Analytics",
      icon: BarChart3,
      title: "Actionable Operational Metrics",
      description:
        "Track resolution times, CSAT scores, and agent workload distribution through intuitive dashboard charts.",
      highlights: [
        "Live response latency tracking",
        "Volume trend analysis",
        "Custom CSV data exports",
      ],
    },
  ];

  return (
    <div className="bg-[#030712] text-slate-100 min-h-screen flex flex-col font-sans overflow-x-hidden relative selection:bg-indigo-500 selection:text-white">
      {/* BACKGROUND DECORATIVE GRADIENTS */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] bg-gradient-to-b from-indigo-600/10 via-blue-500/5 to-transparent blur-3xl pointer-events-none" />

      {/* TOP NAVIGATION BAR */}
      <header className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 flex items-center justify-between z-20 relative">
        <div className="flex items-center gap-2 text-indigo-400 font-bold text-xl tracking-tight cursor-pointer" onClick={() => navigate("/")}>
          <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
            <Bot className="w-6 h-6 text-indigo-400" />
          </div>
          <span>SupportOps<span className="text-indigo-500">.ai</span></span>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
          <button onClick={() => scrollToSection("features")} className="hover:text-white transition-colors">
            Features
          </button>
          <button onClick={() => navigate(ROUTES.pricing)} className="hover:text-white transition-colors">
            Pricing
          </button>
        </nav>

        <div className="flex items-center gap-3">
          {!isAuth ? (
            <>
              <button
                type="button"
                onClick={goLogin}
                className="px-4 py-2 rounded-xl border border-slate-800 bg-slate-900/80 hover:bg-slate-800 hover:border-slate-700 text-slate-200 text-sm font-semibold transition-all inline-flex items-center gap-2"
              >
                <LogIn className="w-4 h-4 text-indigo-400" /> Log In
              </button>
              <button
                type="button"
                onClick={handleLaunchClick}
                disabled={busy}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50"
              >
                Sign Up
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleLaunchClick}
              disabled={busy}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50 inline-flex items-center gap-2"
            >
              <LayoutDashboard className="w-4 h-4" /> Open Dashboard
            </button>
          )}
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative pt-16 pb-16 px-4 sm:px-6 max-w-7xl mx-auto text-center z-10 flex flex-col items-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-6">
          <Sparkles className="w-3.5 h-3.5" /> SupportOps Intelligence Platform
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white max-w-4xl leading-[1.15]">
          Supercharge Customer Operations with{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400">
            Agentic AI
          </span>
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-slate-400 max-w-2xl leading-relaxed">
          Unify inbox queues, automate complex ticket workflows, and empower your
          support team with real-time agent context.
        </p>

        {/* HERO CTA BUTTONS */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleLaunchClick}
            disabled={busy}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-600/25 hover:shadow-indigo-600/40 transition-all inline-flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {ctaLabel} <ArrowRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => scrollToSection("features")}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl border border-slate-800 bg-slate-900/60 text-slate-200 hover:bg-slate-800 hover:border-slate-700 transition-all backdrop-blur-md text-center font-medium"
          >
            Explore Features
          </button>
        </div>

        {/* SECONDARY LINKS */}
        {!busy && (
          <p className="mt-4 text-sm text-slate-500">
            {!isAuth && (
              <>
                Already have an account?{" "}
                <button type="button" onClick={goLogin} className="text-indigo-400 hover:underline font-medium">
                  Log in
                </button>
                <span className="mx-2">·</span>
              </>
            )}
            <button type="button" onClick={() => navigate(ROUTES.pricing)} className="text-indigo-400 hover:underline font-medium">
              View pricing
            </button>
          </p>
        )}

        {/* STATS HIGHLIGHT */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 w-full max-w-4xl pt-8 border-t border-slate-800/80">
          <div>
            <div className="text-2xl sm:text-3xl font-bold text-white">99.9%</div>
            <div className="text-xs text-slate-400 mt-1">Uptime SLA</div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold text-white">&lt; 50ms</div>
            <div className="text-xs text-slate-400 mt-1">Event Latency</div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold text-white">10x</div>
            <div className="text-xs text-slate-400 mt-1">Faster Resolution</div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold text-white">24/7</div>
            <div className="text-xs text-slate-400 mt-1">AI Execution</div>
          </div>
        </div>
      </section>

      {/* INTERACTIVE FEATURES SECTION */}
      <section id="features" className="py-20 px-4 sm:px-6 max-w-7xl mx-auto w-full z-10">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
            Built for High-Scale Operations
          </h2>
          <p className="mt-4 text-slate-400 text-base sm:text-lg">
            Everything you need to deliver instant, high-touch support at scale.
          </p>
        </div>

        {/* TAB HEADERS */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-8 border-b border-slate-800 pb-4">
          {featureTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all text-sm ${isActive
                  ? "bg-indigo-600/20 border border-indigo-500/40 text-indigo-400 shadow-md"
                  : "bg-slate-900/40 border border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                  }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* TAB CONTENT PANELS */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 sm:p-10 backdrop-blur-sm">
          <AnimatePresence mode="wait">
            {featureTabs
              .filter((tab) => tab.id === activeTab)
              .map((tab) => (
                <motion.div
                  key={tab.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center"
                >
                  <div className="space-y-6">
                    <h3 className="text-2xl sm:text-3xl font-bold text-white">
                      {tab.title}
                    </h3>
                    <p className="text-slate-300 text-base leading-relaxed">
                      {tab.description}
                    </p>
                    <ul className="space-y-3">
                      {tab.highlights.map((item, idx) => (
                        <li key={idx} className="flex items-center gap-3 text-slate-200">
                          <CheckCircle2 className="w-5 h-5 text-indigo-400 shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 shadow-inner space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500/80" />
                        <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                        <div className="w-3 h-3 rounded-full bg-green-500/80" />
                      </div>
                      <span className="text-xs text-slate-500 font-mono">live_ops_view.json</span>
                    </div>
                    <div className="space-y-2 font-mono text-xs text-slate-300">
                      <p className="text-indigo-400">// Status: Active SupportOps Session</p>
                      <p>{"{"}</p>
                      <p className="pl-4 text-emerald-400">"agent_status": "ONLINE",</p>
                      <p className="pl-4 text-amber-300">"unassigned_tickets": 0,</p>
                      <p className="pl-4 text-indigo-300">"auto_resolution_rate": "88.4%"</p>
                      <p>{"}"}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
          </AnimatePresence>
        </div>
      </section>

      {/* FINAL CALL TO ACTION */}
      <section className="relative my-12 mx-4 sm:mx-6 max-w-7xl md:mx-auto rounded-3xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/50 via-slate-900 to-slate-950 p-10 sm:p-16 text-center shadow-2xl">
        <div className="relative z-10 max-w-3xl mx-auto space-y-6">
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white">
            Ready to transform your support operations?
          </h2>
          <p className="text-slate-300 text-base sm:text-lg max-w-xl mx-auto">
            Experience real-time ticket automation and intelligent agent routing today.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              type="button"
              onClick={handleLaunchClick}
              disabled={busy}
              className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-lg font-bold shadow-xl shadow-indigo-600/30 transition-all disabled:opacity-50"
            >
              {ctaLabel}
            </button>
            {!isAuth && (
              <button
                type="button"
                onClick={goLogin}
                className="w-full sm:w-auto px-8 py-4 rounded-xl border border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-slate-200 text-lg font-semibold transition-all"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="mt-auto border-t border-slate-800/80 py-8 px-4 text-center text-xs text-slate-500">
        &copy; {new Date().getFullYear()} SupportOps Inc. All rights reserved.
      </footer>
    </div>
  );
}