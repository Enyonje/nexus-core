import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import CTAButton from "../components/CTAButton.jsx";
import {
  Zap,
  LayoutDashboard,
  BarChart3,
  Bot,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Users,
  Globe2,
  TrendingUp,
  MessageSquareCode
} from "lucide-react";

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState("inbox");

  return (
    <div className="bg-[#030712] text-slate-100 min-h-screen flex flex-col font-sans overflow-x-hidden relative selection:bg-blue-500 selection:text-white">
      {/* Background Decorative Glow Highlights */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[400px] bg-gradient-to-tr from-blue-600/20 via-indigo-500/20 to-purple-600/10 blur-[130px] pointer-events-none rounded-full" />
      <div className="absolute top-[40%] right-[-10%] w-[500px] h-[500px] bg-cyan-500/10 blur-[150px] pointer-events-none rounded-full" />

      {/* 🚀 HERO SECTION */}
      <section className="relative pt-24 pb-20 md:pt-36 md:pb-28 px-4 sm:px-6 max-w-7xl mx-auto text-center flex flex-col items-center">
        {/* Animated Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs sm:text-sm font-medium mb-8 backdrop-blur-md hover:bg-blue-500/20 transition cursor-default">
          <Sparkles className="w-4 h-4 text-blue-400 animate-pulse" />
          <span>SupportOps Pro v2.5 is now Live</span>
          <span className="bg-blue-500/20 text-blue-300 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold">New</span>
        </div>

        {/* Hero Headline */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.1] max-w-5xl">
          Automate, Scale, & Transform <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
            Your Customer Support
          </span>
        </h1>

        {/* Hero Subtitle */}
        <p className="mt-6 text-slate-300 text-base sm:text-xl max-w-3xl leading-relaxed font-normal">
          Deliver instant AI ticket resolutions, real-time WebSocket syncing, and predictive analytics. Empower agents, executives, and investors with role-tailored dashboards.
        </p>

        {/* Hero CTA Actions */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
          {/* ✅ CTAButton now handles routing directly */}
          <CTAButton
            to="/signup"
            className="w-full sm:w-auto px-8 py-3.5 text-base font-semibold shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all flex items-center justify-center gap-2"
          >
            Start Free Trial <ArrowRight className="w-4 h-4" />
          </CTAButton>

          <CTAButton
            to="/features"
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl border border-slate-700 bg-slate-900/60 text-slate-200 hover:bg-slate-800 hover:border-slate-600 transition-all backdrop-blur-md text-center font-medium"
          >
            Explore Features
          </CTAButton>
        </div>


        {/* Trust Chips below CTA */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
          <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> No credit card required</span>
          <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> 5-minute setup</span>
          <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> SOC2 Compliant</span>
        </div>

        {/* 🖥️ INTERACTIVE PRODUCT PREVIEW MOCKUP */}
        <div className="mt-16 w-full max-w-5xl rounded-2xl border border-slate-800 bg-slate-900/80 p-2 sm:p-4 shadow-2xl backdrop-blur-xl relative">
          {/* Mockup Header Controls */}
          <div className="flex flex-wrap items-center justify-between pb-3 px-3 border-b border-slate-800/80 gap-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-rose-500/80" />
              <div className="w-3 h-3 rounded-full bg-amber-500/80" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
            </div>

            {/* Tab Selectors */}
            <div className="flex gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800/80 text-xs font-medium">
              {[
                { id: "inbox", label: "AI Real-Time Inbox", icon: Bot },
                { id: "dashboards", label: "Role Dashboards", icon: LayoutDashboard },
                { id: "analytics", label: "Predictive Analytics", icon: BarChart3 },
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition ${activeTab === tab.id
                      ? "bg-blue-600 text-white shadow"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                      }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mockup Screen Viewport */}
          <div className="p-4 sm:p-8 bg-slate-950/70 rounded-xl min-h-[260px] sm:min-h-[340px] flex items-center justify-center border border-slate-800/50">
            {activeTab === "inbox" && (
              <div className="w-full space-y-3 text-left max-w-2xl">
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                    <MessageSquareCode className="w-4 h-4" />
                  </div>
                  <div className="flex-1 text-xs sm:text-sm">
                    <div className="flex justify-between text-slate-400 mb-1">
                      <span className="font-semibold text-slate-200">Customer #8492</span>
                      <span>Just now</span>
                    </div>
                    <p className="text-slate-300">How do I integrate the WebSocket SDK with my Node.js backend?</p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-blue-950/40 border border-blue-500/30 flex items-start gap-3 relative overflow-hidden">
                  <div className="absolute inset-y-0 left-0 w-1 bg-blue-500" />
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="flex-1 text-xs sm:text-sm">
                    <div className="flex items-center justify-between text-blue-400 mb-1">
                      <span className="font-semibold flex items-center gap-1">
                        SupportOps AI Co-Pilot <Sparkles className="w-3 h-3" />
                      </span>
                      <span className="text-emerald-400 text-[11px] bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">Auto-Resolved</span>
                    </div>
                    <p className="text-slate-300">Here is the quick setup snippet: <code className="bg-slate-900 px-1.5 py-0.5 rounded text-blue-300 font-mono text-xs">npm i @supportops/ws-sdk</code>. We've auto-verified your API key!</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "dashboards" && (
              <div className="grid sm:grid-cols-3 gap-3 w-full text-left">
                {[
                  { role: "Agent View", task: "12 Open Tickets", status: "Active Sync", color: "text-blue-400" },
                  { role: "Executive View", task: "CSAT Score: 98.4%", status: "+4.2% this month", color: "text-emerald-400" },
                  { role: "Investor View", task: "ARR Impact: $1.2M", status: "Real-time Metrics", color: "text-purple-400" },
                ].map((d, i) => (
                  <div key={i} className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                    <span className="text-xs text-slate-400 uppercase tracking-wider">{d.role}</span>
                    <div className="text-base font-bold text-slate-100">{d.task}</div>
                    <div className={`text-xs ${d.color}`}>{d.status}</div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "analytics" && (
              <div className="w-full space-y-4">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>AI Resolution Rate Forecast</span>
                  <span className="text-emerald-400 font-medium">+88% Automated</span>
                </div>
                <div className="h-24 w-full flex items-end gap-2 pt-2">
                  {[35, 45, 60, 55, 75, 85, 95].map((val, idx) => (
                    <div key={idx} className="flex-1 bg-slate-800 rounded-t overflow-hidden relative group">
                      <div
                        className="bg-gradient-to-t from-blue-600 to-indigo-400 w-full transition-all duration-500 rounded-t"
                        style={{ height: `${val}%` }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 📊 STATS / METRICS BAR */}
      <section className="border-y border-slate-800/80 bg-slate-950/60 py-10 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div>
            <div className="text-3xl sm:text-4xl font-extrabold text-white">99.9%</div>
            <div className="text-xs sm:text-sm text-slate-400 mt-1">Uptime SLA SLA</div>
          </div>
          <div>
            <div className="text-3xl sm:text-4xl font-extrabold text-blue-400">10x</div>
            <div className="text-xs sm:text-sm text-slate-400 mt-1">Faster First Response</div>
          </div>
          <div>
            <div className="text-3xl sm:text-4xl font-extrabold text-indigo-400">45%</div>
            <div className="text-xs sm:text-sm text-slate-400 mt-1">Support Cost Reduction</div>
          </div>
          <div>
            <div className="text-3xl sm:text-4xl font-extrabold text-purple-400">2M+</div>
            <div className="text-xs sm:text-sm text-slate-400 mt-1">Tickets Processed</div>
          </div>
        </div>
      </section>

      {/* 🌐 TRUSTED INDUSTRY LOGOS */}
      <section className="py-12 border-b border-slate-800/50 bg-slate-900/20">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <p className="text-xs sm:text-sm font-semibold text-slate-500 uppercase tracking-widest mb-6">
            Trusted by high-growth teams in key global sectors
          </p>
          <div className="flex flex-wrap justify-center items-center gap-6 sm:gap-12 opacity-70">
            {["FinTech", "E-Commerce", "SaaS Enterprise", "Healthcare", "EdTech"].map((tag) => (
              <div key={tag} className="flex items-center gap-2 text-slate-300 font-semibold text-sm sm:text-base hover:opacity-100 transition">
                <Globe2 className="w-4 h-4 text-blue-500" />
                <span>{tag}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ✨ CORE FEATURES GRID */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-24 sm:py-32">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-xs sm:text-sm text-blue-400 font-bold uppercase tracking-widest mb-2">
            Built for Modern Teams
          </h2>
          <p className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Everything you need to scale customer operations
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              title: "Role-Based Dashboards",
              desc: "Tailored views for agents, executives, and investors — ensuring absolute clarity, alignment, and metrics control at every organizational level.",
              icon: LayoutDashboard,
              badge: "Personalized UI",
              glow: "group-hover:border-blue-500/50"
            },
            {
              title: "Real-Time AI Inbox",
              desc: "Resolve tickets instantly with WebSocket-powered sync, automated agent co-pilots, and intelligent ticket routing.",
              icon: Zap,
              badge: "Sub-second Sync",
              glow: "group-hover:border-indigo-500/50"
            },
            {
              title: "Predictive Analytics",
              desc: "Forecast resolution trends, track team velocity, monitor system health, and unlock actionable insights that drive revenue.",
              icon: TrendingUp,
              badge: "AI Forecasting",
              glow: "group-hover:border-purple-500/50"
            },
          ].map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className={`group relative rounded-2xl bg-slate-900/50 border border-slate-800 p-8 hover:bg-slate-900/90 transition-all duration-300 hover:-translate-y-1.5 backdrop-blur-xl ${f.glow}`}
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-semibold text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-full border border-slate-700/50">
                    {f.badge}
                  </span>
                </div>
                <h3 className="font-bold text-xl text-white group-hover:text-blue-300 transition-colors">
                  {f.title}
                </h3>
                <p className="mt-3 text-slate-400 text-sm leading-relaxed">
                  {f.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* 🔥 FINAL HIGH-CONVERTING CTA */}
      <section className="relative my-12 mx-4 sm:mx-6 max-w-7xl md:mx-auto rounded-3xl overflow-hidden border border-blue-500/30 bg-gradient-to-br from-blue-900/40 via-slate-900 to-indigo-950/60 p-10 sm:p-16 text-center shadow-2xl backdrop-blur-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-1.5 bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs px-3 py-1 rounded-full font-medium">
            <ShieldCheck className="w-4 h-4" /> Enterprise-Grade Security Guaranteed
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Ready to transform your support operations?
          </h2>
          <p className="text-slate-300 text-base sm:text-lg leading-relaxed">
            Join forward-thinking teams using SupportOps Pro. Deploy in minutes, automate routine inquiries, and deliver world-class customer service.
          </p>
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <CTAButton
              to="/signup"
              className="w-full sm:w-auto px-8 py-4 text-lg font-bold shadow-xl shadow-blue-600/30 hover:scale-105 transition-all"
            >
              Start Free Trial Now
            </CTAButton>

          </div>
        </div>
      </section>

      {/* 🦶 SIMPLE FOOTER */}
      <footer className="border-t border-slate-900 py-8 text-center text-xs text-slate-500">
        <p>© {new Date().getFullYear()} SupportOps Pro. All rights reserved.</p>
      </footer>
    </div>
  );
}