
import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Bot,
  MessageSquare,
  BarChart3,
  Eye,
} from "lucide-react";

// ============================================================
// PUBLIC ROUTES
// ============================================================

const SUPPORTOPS_HOME = "/supportops";
const DEMO_ROUTE = "/supportops/demo";
const PRICING_ROUTE = "/supportops/pricing";

// ============================================================
// SAFE INTERNAL ROUTE VALIDATION
// ============================================================

function isSafePath(path) {
  return (
    typeof path === "string" &&
    path.startsWith("/") &&
    !path.startsWith("//") &&
    !path.includes("\\") &&
    !/[\r\n]/.test(path)
  );
}

// ============================================================
// PUBLIC LANDING PAGE
// ============================================================

export default function LandingPage() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("inbox");

  // ==========================================================
  // PUBLIC NAVIGATION
  // ==========================================================

  const safeNavigate = useCallback(
    (path, options = {}) => {
      if (!isSafePath(path)) {
        console.error(
          "[LandingPage] Invalid destination:",
          path
        );
        return;
      }

      navigate(path, options);
    },
    [navigate]
  );

  // ==========================================================
  // PUBLIC ACTIONS
  // ==========================================================

  const handleLaunchClick = useCallback(() => {
    safeNavigate(PRICING_ROUTE);
  }, [safeNavigate]);

  const handleFreeBrowse = useCallback(() => {
    safeNavigate(DEMO_ROUTE);
  }, [safeNavigate]);

  const scrollToSection = useCallback((id) => {
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, []);

  // ==========================================================
  // FEATURES
  // ==========================================================

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
        "Custom triage and escalation rules",
        "Automated routing workflows",
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

  const selectedTab =
    featureTabs.find((tab) => tab.id === activeTab) ??
    featureTabs[0];

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-[#030712] font-sans text-slate-100 selection:bg-indigo-500 selection:text-white">

      {/* BACKGROUND */}

      <div className="pointer-events-none absolute left-1/2 top-0 h-[500px] w-full max-w-7xl -translate-x-1/2 bg-gradient-to-b from-indigo-600/10 via-blue-500/5 to-transparent blur-3xl" />

      {/* NAVIGATION */}

      <header className="relative z-20 mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-6 sm:px-6">

        <button
          type="button"
          onClick={() => safeNavigate(SUPPORTOPS_HOME)}
          aria-label="SupportOps home"
          className="flex items-center gap-2 text-xl font-bold tracking-tight text-indigo-400"
        >
          <span className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 p-2">
            <Bot className="h-6 w-6" />
          </span>

          <span>
            SupportOps
            <span className="text-indigo-500">.ai</span>
          </span>
        </button>

        <nav className="hidden items-center gap-8 text-sm font-medium text-slate-400 md:flex">

          <button
            type="button"
            onClick={() => scrollToSection("features")}
            className="transition-colors hover:text-white"
          >
            Features
          </button>

          <button
            type="button"
            onClick={handleFreeBrowse}
            className="transition-colors hover:text-white"
          >
            Live demo
          </button>

          <button
            type="button"
            onClick={handleLaunchClick}
            className="transition-colors hover:text-white"
          >
            Pricing
          </button>

        </nav>

        <div className="flex items-center gap-3">

          <button
            type="button"
            onClick={handleFreeBrowse}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-2 text-sm font-semibold text-slate-200 transition-all hover:bg-slate-800"
          >
            <Eye className="h-4 w-4 text-indigo-400" />
            Browse Free
          </button>

          <button
            type="button"
            onClick={handleLaunchClick}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition-all hover:bg-indigo-500 sm:px-5"
          >
            Get Started
            <ArrowRight className="h-4 w-4" />
          </button>

        </div>
      </header>

      {/* HERO */}

      <section className="relative z-10 mx-auto flex max-w-7xl flex-col items-center px-4 pb-16 pt-16 text-center sm:px-6">

        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-indigo-400">
          <Sparkles className="h-3.5 w-3.5" />
          SupportOps Intelligence Platform
        </div>

        <h1 className="max-w-4xl text-4xl font-extrabold leading-[1.15] tracking-tight text-white sm:text-6xl lg:text-7xl">
          Supercharge Customer Operations with{" "}
          <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 bg-clip-text text-transparent">
            Agentic AI
          </span>
        </h1>

        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-400 sm:text-xl">
          Unify inbox queues, automate complex ticket
          workflows, and empower your support team with
          real-time agent context. Workspace creation is
          securely managed by administrators.
        </p>

        {/* HERO ACTIONS */}

        <div className="mt-10 flex w-full flex-col items-center justify-center gap-4 sm:w-auto sm:flex-row">

          <button
            type="button"
            onClick={handleFreeBrowse}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-8 py-3.5 font-semibold text-indigo-300 transition-all hover:bg-indigo-500/20 sm:w-auto"
          >
            <Eye className="h-4 w-4" />
            Browse for Free
          </button>

          <button
            type="button"
            onClick={handleLaunchClick}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-8 py-3.5 font-semibold text-white shadow-lg shadow-indigo-600/25 transition-all hover:bg-indigo-500 sm:w-auto"
          >
            Get Started
            <ArrowRight className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => scrollToSection("features")}
            className="w-full rounded-xl border border-slate-800 bg-slate-900/60 px-8 py-3.5 font-medium text-slate-200 hover:bg-slate-800 sm:w-auto"
          >
            Explore Features
          </button>

        </div>

        {/* STATS */}

        <div className="mt-16 grid w-full max-w-4xl grid-cols-2 gap-6 border-t border-slate-800/80 pt-8 md:grid-cols-4">

          {[
            ["99.9%", "Uptime SLA"],
            ["< 50ms", "Event Latency"],
            ["10x", "Faster Resolution"],
            ["24/7", "AI Execution"],
          ].map(([value, label]) => (
            <div key={label}>
              <div className="text-2xl font-bold text-white sm:text-3xl">
                {value}
              </div>

              <div className="mt-1 text-xs text-slate-400">
                {label}
              </div>
            </div>
          ))}

        </div>
      </section>

      {/* FEATURES */}

      <section
        id="features"
        className="z-10 mx-auto w-full max-w-7xl px-4 py-20 sm:px-6"
      >

        <div className="mx-auto mb-12 max-w-3xl text-center">

          <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
            Built for High-Scale Operations
          </h2>

          <p className="mt-4 text-base text-slate-400 sm:text-lg">
            Everything you need to deliver instant,
            high-touch support at scale.
          </p>

        </div>

        {/* TABS */}

        <div className="mb-8 flex flex-wrap items-center justify-center gap-2 border-b border-slate-800 pb-4">

          {featureTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                aria-pressed={isActive}
                className={`flex items-center gap-2 rounded-xl border px-5 py-2.5 text-sm font-medium transition-all ${isActive
                  ? "border-indigo-500/40 bg-indigo-600/20 text-indigo-400"
                  : "border-transparent bg-slate-900/40 text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                  }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}

        </div>

        {/* TAB CONTENT */}

        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur-sm sm:p-10">

          <AnimatePresence mode="wait">

            <motion.div
              key={selectedTab.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2"
            >

              <div className="space-y-6">

                <h3 className="text-2xl font-bold text-white sm:text-3xl">
                  {selectedTab.title}
                </h3>

                <p className="text-base leading-relaxed text-slate-300">
                  {selectedTab.description}
                </p>

                <ul className="space-y-3">
                  {selectedTab.highlights.map((item) => (
                    <li
                      key={item}
                      className="flex items-center gap-3 text-slate-200"
                    >
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-indigo-400" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

              </div>

              <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-950 p-6 shadow-inner">

                <div className="flex items-center justify-between border-b border-slate-800 pb-3">

                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-red-500/80" />
                    <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
                    <div className="h-3 w-3 rounded-full bg-green-500/80" />
                  </div>

                  <span className="font-mono text-xs text-slate-500">
                    live_ops_view.json
                  </span>

                </div>

                <div className="space-y-2 font-mono text-xs text-slate-300">

                  <p className="text-indigo-400">
                    // Status: Active SupportOps Session
                  </p>

                  <p>{"{"}</p>

                  <p className="pl-4 text-emerald-400">
                    "agent_status": "ONLINE",
                  </p>

                  <p className="pl-4 text-amber-300">
                    "unassigned_tickets": 0,
                  </p>

                  <p className="pl-4 text-indigo-300">
                    "auto_resolution_rate": "88.4%"
                  </p>

                  <p>{"}"}</p>

                </div>
              </div>

            </motion.div>

          </AnimatePresence>

        </div>
      </section>

      {/* FINAL CTA */}

      <section className="relative mx-4 my-12 max-w-7xl rounded-3xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/50 via-slate-900 to-slate-950 p-10 text-center shadow-2xl sm:mx-6 sm:p-16 md:mx-auto">

        <div className="relative z-10 mx-auto max-w-3xl space-y-6">

          <h2 className="text-3xl font-extrabold text-white sm:text-5xl">
            Ready to transform your support operations?
          </h2>

          <p className="mx-auto max-w-xl text-base text-slate-300 sm:text-lg">
            Explore intelligent agent routing,
            automated workflows, and administrative
            workspace controls.
          </p>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">

            <button
              type="button"
              onClick={handleFreeBrowse}
              className="inline-flex w-full items-center justify-center rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-8 py-4 text-lg font-bold text-indigo-300 hover:bg-indigo-500/20 sm:w-auto"
            >
              Browse for Free
            </button>

            <button
              type="button"
              onClick={handleLaunchClick}
              className="inline-flex w-full items-center justify-center rounded-xl bg-indigo-600 px-8 py-4 text-lg font-bold text-white shadow-xl shadow-indigo-600/30 hover:bg-indigo-500 sm:w-auto"
            >
              Get Started
            </button>

          </div>
        </div>
      </section>

      {/* FOOTER */}

      <footer className="mt-auto border-t border-slate-800/80 px-4 py-8 text-center text-xs text-slate-500">

        &copy; {new Date().getFullYear()} SupportOps Inc.
        All rights reserved.

        <p className="mt-2">
          Workspace creation is restricted to administrators.
        </p>

      </footer>

    </div>
  );
}
