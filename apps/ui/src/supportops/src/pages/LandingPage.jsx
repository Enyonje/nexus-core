import React, { useState } from "react";
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
  Globe2,
  TrendingUp,
  MessageSquareCode
} from "lucide-react";

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState("inbox");

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="bg-[#030712] text-slate-100 min-h-screen flex flex-col font-sans overflow-x-hidden relative selection:bg-blue-500 selection:text-white">
      {/* Background Decorative Glow Highlights */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[400px] bg-gradient-to-tr from-blue-600/20 via-indigo-500/20 to-purple-600/10 blur-[130px] pointer-events-none rounded-full" />
      <div className="absolute top-[40%] right-[-10%] w-[500px] h-[500px] bg-cyan-500/10 blur-[150px] pointer-events-none rounded-full" />

      {/* 🚀 HERO SECTION */}
      <section className="relative pt-24 pb-20 md:pt-36 md:pb-28 px-4 sm:px-6 max-w-7xl mx-auto text-center flex flex-col items-center">
        {/* Animated Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs sm:text-sm font-medium mb-8 backdrop-blur-md">
          <Sparkles className="w-4 h-4 text-blue-400 animate-pulse" />
          <span>SupportOps Pro v2.5 is now Live</span>
          <span className="bg-blue-500/20 text-blue-300 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold">
            New
          </span>
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
          <CTAButton
            to="/signup"
            className="w-full sm:w-auto px-8 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all flex items-center justify-center gap-2"
          >
            Start Free Trial <ArrowRight className="w-4 h-4" />
          </CTAButton>

          <CTAButton
            onClick={() => scrollToSection("features")}
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
              desc: "Tailored views for agents, executives, and investors.",
              icon: LayoutDashboard,
              badge: "Personalized UI"
            },
            {
              title: "Real-Time AI Inbox",
              desc: "Resolve tickets instantly with WebSocket-powered sync.",
              icon: Zap,
              badge: "Sub-second Sync"
            },
            {
              title: "Predictive Analytics",
              desc: "Forecast resolution trends and track team velocity.",
              icon: TrendingUp,
              badge: "AI Forecasting"
            }
          ].map((f) => (
            <div key={f.title} className="rounded-2xl bg-slate-900/50 border border-slate-800 p-8">
              <div className="flex items-center justify-between mb-6">
                <f.icon className="w-6 h-6 text-blue-400" />
                <span className="text-[11px] text-slate-400 bg-slate-800 px-2.5 py-1 rounded-full">{f.badge}</span>
              </div>
              <h3 className="font-bold text-xl text-white">{f.title}</h3>
              <p className="mt-3 text-slate-400 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 🔥 FINAL HIGH-CONVERTING CTA */}
      <section className="relative my-12 mx-4 sm:mx-6 max-w-7xl md:mx-auto rounded-3xl border border-blue-500/30 bg-gradient-to-br from-blue-900/40 via-slate-900 to-indigo-950/60 p-10 sm:p-16 text-center shadow-2xl">
        <div className="relative z-10 max-w-3xl mx-auto space-y-6">
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white">
            Ready to transform your support operations?
          </h2>
          <CTAButton
            to="/signup"
            className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white text-lg font-bold shadow-xl shadow-blue-600/30"
          >
            Start Free Trial Now
          </CTAButton>
        </div>
      </section>
    </div>
  );
}