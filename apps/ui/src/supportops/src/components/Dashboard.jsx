import React, { useState, useEffect } from "react";
import {
  Zap,
  Ticket,
  BarChart3,
  Workflow,
  Sparkles,
  Copy,
  Check,
  Play,
  CheckCircle2,
  AlertCircle,
  Clock,
  Radio,
  Sliders,
  Settings,
  ChevronRight,
  Send,
  Plus
} from "lucide-react";

export default function SupportOpsDashboard() {
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [isLive, setIsLive] = useState(true);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);

  // Live simulated ticket stream state
  const [tickets, setTickets] = useState([
    {
      id: "TCK-8921",
      customer: "alex@acme.inc",
      subject: "Stripe subscription failed on renewal",
      status: "AI Resolved",
      latency: "120ms",
      timestamp: "Just now",
      intent: "Billing",
      confidence: 0.98
    },
    {
      id: "TCK-8920",
      customer: "sarah@techcorp.io",
      subject: "API Rate limit exceeded on /api/v1/stream",
      status: "Escalated",
      latency: "310ms",
      timestamp: "2m ago",
      intent: "Technical",
      confidence: 0.89
    },
    {
      id: "TCK-8919",
      customer: "dev@buildfast.co",
      subject: "Unable to verify SSL certificate on endpoint",
      status: "In Progress",
      latency: "84ms",
      timestamp: "5m ago",
      intent: "Security",
      confidence: 0.95
    }
  ]);

  const [simulatedPrompt, setSimulatedPrompt] = useState("");

  const webhookUrl = "https://api.nexusthecore.com/api/v1/supportops/webhooks/stripe";

  const copyToClipboard = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  const handleSimulateTicket = (e) => {
    e.preventDefault();
    if (!simulatedPrompt.trim()) return;

    const newTicket = {
      id: `TCK-${Math.floor(1000 + Math.random() * 9000)}`,
      customer: "live-demo@customer.com",
      subject: simulatedPrompt,
      status: "AI Processing",
      latency: `${Math.floor(60 + Math.random() * 80)}ms`,
      timestamp: "Just now",
      intent: "Inference",
      confidence: 0.96
    };

    setTickets([newTicket, ...tickets]);
    setSimulatedPrompt("");

    setTimeout(() => {
      setTickets((prev) =>
        prev.map((t) =>
          t.id === newTicket.id ? { ...t, status: "AI Resolved" } : t
        )
      );
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 flex font-sans antialiased">

      {/* SIDEBAR NAVIGATION */}
      <aside className="hidden lg:flex w-72 flex-col border-r border-slate-800 bg-[#020617]/80 backdrop-blur-md p-6">
        <div className="flex items-center gap-3 mb-10">
          <div className="p-2.5 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400">
            <Zap className="w-6 h-6 fill-blue-500/20" />
          </div>
          <div>
            <span className="font-black text-xl tracking-tight text-white">
              SupportOps
            </span>
            <span className="block text-[10px] font-mono text-blue-400 tracking-wider">
              NEXUS CORE V1
            </span>
          </div>
        </div>

        <nav className="space-y-1.5">
          {[
            { name: "Dashboard", icon: BarChart3 },
            { name: "Live Tickets", icon: Ticket, count: tickets.length },
            { name: "Workflows", icon: Workflow },
            { name: "Settings", icon: Settings }
          ].map(({ name, icon: Icon, count }) => (
            <button
              key={name}
              onClick={() => setActiveTab(name)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 ${activeTab === name
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/25"
                : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                }`}
            >
              <div className="flex items-center gap-3">
                <Icon className="w-4 h-4" />
                <span>{name}</span>
              </div>
              {count !== undefined && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {count}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* ONBOARDING CALL TO ACTION CARD */}
        <div className="mt-auto rounded-2xl bg-gradient-to-b from-blue-900/30 to-slate-900 border border-blue-500/20 p-5 space-y-3">
          <div className="flex items-center gap-2 text-blue-400">
            <Radio className="w-4 h-4 animate-pulse" />
            <span className="text-xs font-semibold uppercase tracking-wider">
              Channel Status
            </span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Webhook integration active. Incoming tickets are orchestrating automatically.
          </p>
          <button
            onClick={() => setShowSetupModal(true)}
            className="w-full text-xs py-2.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition shadow-md flex items-center justify-center gap-2"
          >
            <Plus className="w-3.5 h-3.5" /> Direct Ingestion
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-6 lg:p-10 space-y-8 overflow-y-auto">

        {/* TOP BAR / HEADER */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black tracking-tight text-white">
                Operations Overview
              </h1>
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Live Feed
              </span>
            </div>
            <p className="text-slate-400 text-sm mt-1">
              Autonomous AI agent routing and real-time execution metrics
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSetupModal(true)}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-2 transition"
            >
              <Sliders className="w-4 h-4 text-blue-400" /> Webhook Setup
            </button>

            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300">
              <Sparkles className="w-4 h-4 text-blue-400" />
              <span>AI Accuracy</span>
              <span className="font-bold text-white">98.2%</span>
            </div>
          </div>
        </header>

        {/* METRICS GRID */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { title: "Active Workflows", value: "12", subtext: "3 Temporal workers live", icon: Workflow, color: "text-blue-400" },
            { title: "Auto-Resolved", value: "842", subtext: "88% autonomous rate", icon: Zap, color: "text-amber-400" },
            { title: "Open Tickets", value: tickets.length.toString(), subtext: "Avg response 84ms", icon: Ticket, color: "text-emerald-400" },
            { title: "System Uptime", value: "99.98%", subtext: "PostgreSQL connected", icon: BarChart3, color: "text-indigo-400" }
          ].map((stat) => (
            <div
              key={stat.title}
              className="group rounded-2xl bg-slate-900/60 border border-slate-800 p-5 hover:border-slate-700 hover:bg-slate-900 transition-all duration-200"
            >
              <div className="flex items-center justify-between text-slate-400">
                <p className="text-xs font-semibold uppercase tracking-wider">
                  {stat.title}
                </p>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <h2 className="text-4xl font-black mt-3 text-white tracking-tight">
                {stat.value}
              </h2>
              <p className="text-xs text-slate-500 mt-2 font-mono">
                {stat.subtext}
              </p>
            </div>
          ))}
        </section>

        {/* INGESTION & QUICK TEST SIMULATOR */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Play className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-bold text-white">
                Simulate Customer Ticket Submission
              </h3>
            </div>
            <span className="text-xs font-mono text-slate-500">POST /api/v1/supportops/tickets</span>
          </div>

          <form onSubmit={handleSimulateTicket} className="flex gap-3">
            <input
              type="text"
              value={simulatedPrompt}
              onChange={(e) => setSimulatedPrompt(e.target.value)}
              placeholder="e.g., How do I configure my custom domain on Vercel?"
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
            />
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-2 transition shadow-lg shadow-blue-600/20"
            >
              <Send className="w-3.5 h-3.5" /> Inject Ticket
            </button>
          </form>
        </section>

        {/* LIVE TICKET STREAM */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">Live Execution Stream</h2>
              <p className="text-xs text-slate-400">
                Server-Sent Events streaming directly from Fastify backend
              </p>
            </div>
            <span className="text-xs text-mono text-blue-400 bg-blue-950/60 border border-blue-800/50 px-3 py-1 rounded-full">
              SSE Connected
            </span>
          </div>

          <div className="space-y-3">
            {tickets.map((t) => (
              <div
                key={t.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs font-bold text-blue-400">
                      {t.id}
                    </span>
                    <span className="text-xs text-slate-500">•</span>
                    <span className="text-xs text-slate-400">{t.customer}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">
                      {t.intent}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-slate-200">{t.subject}</p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right hidden md:block">
                    <p className="text-xs font-mono text-slate-400">{t.latency}</p>
                    <p className="text-[10px] text-slate-500">{t.timestamp}</p>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-1.5 ${t.status === "AI Resolved"
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : t.status === "Escalated"
                        ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                        : "bg-blue-500/10 text-blue-400 border-blue-500/20 animate-pulse"
                      }`}
                  >
                    {t.status === "AI Resolved" ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : t.status === "Escalated" ? (
                      <AlertCircle className="w-3.5 h-3.5" />
                    ) : (
                      <Clock className="w-3.5 h-3.5" />
                    )}
                    {t.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* SETUP / ONBOARDING MODAL */}
      {showSetupModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-6 shadow-2xl">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-white">Connect Ingestion Stream</h3>
                <p className="text-xs text-slate-400 mt-1">
                  How customers trigger automated ticket workflows
                </p>
              </div>
              <button
                onClick={() => setShowSetupModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">
                  Your SupportOps Webhook Endpoint
                </label>
                <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl p-2.5">
                  <input
                    type="text"
                    readOnly
                    value={webhookUrl}
                    className="bg-transparent text-xs text-slate-300 font-mono flex-1 focus:outline-none"
                  />
                  <button
                    onClick={copyToClipboard}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                  >
                    {copiedWebhook ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-blue-950/30 border border-blue-800/40 space-y-2">
                <h4 className="text-xs font-bold text-blue-400">Quick Integration Steps:</h4>
                <ol className="text-xs text-slate-300 space-y-1.5 list-decimal list-inside leading-relaxed">
                  <li>Copy your unique endpoint above.</li>
                  <li>Paste into your Stripe/Zendesk/Custom app webhooks.</li>
                  <li>Tickets will flow directly into this real-time stream.</li>
                </ol>
              </div>
            </div>

            <button
              onClick={() => setShowSetupModal(false)}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-xs text-white transition"
            >
              Done & Return to Live View
            </button>
          </div>
        </div>
      )}
    </div>
  );
}