import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  Bot,
  Zap,
  Cpu,
  Layers,
  ArrowRight,
  Activity,
  CheckCircle2,
  Database,
  Globe,
  Terminal,
} from "lucide-react";

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState("compliance");
  const location = useLocation();

  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6 },
  };

  const specialisedAgents = [
    {
      id: "compliance",
      title: "Cross-Border Compliance System",
      slug: "cross-border-compliance-system",
      desc: "Real-time international statutory screening, localized regulatory risk mitigation, and automated cross-border legal checks.",
      path: "/compliance",
      status: "Production Ready",
      color: "from-emerald-400 to-teal-500",
      accent: "emerald",
      icon: ShieldCheck,
      metrics: { latency: "14ms", throughput: "12.4k/sec", accuracy: "99.9%" },
    },
    {
      id: "support",
      title: "Support-Ops AI",
      slug: "support-ops-ai",
      desc: "Autonomous triage, self-healing integration setups, and SLA escalation tracking powered by internal engineering context.",
      path: "{targetDashboard}",
      status: "Beta Access",
      color: "from-blue-400 to-indigo-500",
      accent: "blue",
      icon: Bot,
      metrics: { latency: "42ms", throughput: "3.1k/sec", accuracy: "98.5%" },
    },
  ];

  return (
    <div className="min-h-screen bg-[#020617] text-white selection:bg-blue-500/30 overflow-x-hidden font-sans relative">
      {/* 1. BACKGROUND GRID & GLOWS */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/15 blur-[140px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-600/15 blur-[140px] rounded-full" />
      </div>

      {/* 2. REFINED NAVIGATION */}
      <nav className="relative z-50 flex justify-between items-center px-6 py-8 max-w-7xl mx-auto backdrop-blur-md bg-[#020617]/50 rounded-b-2xl border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
            <Cpu className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-black tracking-tighter bg-gradient-to-r from-blue-400 via-indigo-300 to-white bg-clip-text text-transparent">
            NEXUS CORE
          </span>
        </div>

        <div className="hidden md:flex items-center gap-10 text-[11px] font-black uppercase tracking-widest text-slate-400">
          <Link to="/docs" className="hover:text-blue-400 transition-colors">Platform</Link>
          <Link to="/agents" className="text-blue-400 border-b border-blue-500/50 pb-0.5 tracking-widest">Specialised Agents</Link>
          <Link to="/subscription" className="hover:text-blue-400 transition-colors">Pricing</Link>
          <Link to="/architecture" className="hover:text-blue-400 transition-colors">Architecture</Link>
        </div>

        <Link
          to="/login"
          state={{ from: location.pathname }}
          className="px-6 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all text-[11px] font-black uppercase tracking-widest backdrop-blur-md shadow-sm"
        >
          Client Login
        </Link>
      </nav>

      {/* 3. HERO SECTION */}
      <section className="relative z-10 px-6 pt-24 pb-20 max-w-7xl mx-auto">
        <motion.div {...fadeInUp} className="text-center max-w-4xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 text-[10px] font-black tracking-[0.2em] uppercase mb-8 shadow-[0_0_20px_rgba(59,130,246,0.2)]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            Beta v1.0 Live on Vercel
          </div>

          <h1 className="text-5xl md:text-7xl font-black mb-8 tracking-tighter leading-[0.95] text-white">
            From Static Workflows to <br />
            <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
              Autonomous Swarms
            </span>
          </h1>

          <p className="text-base md:text-lg text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed font-medium">
            The AI-native execution engine that deploys sandboxed digital operatives. Define the high-level intent — Sentinel Swarms manage the pipeline end-to-end.
          </p>

          <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
            <Link
              to="/agents"
              state={{ from: location.pathname }}
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-black uppercase tracking-widest shadow-[0_0_35px_rgba(37,99,235,0.35)] transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
            >
              Explore Agents <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/register"
              state={{ from: location.pathname }}
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-slate-900/80 border border-white/10 hover:border-blue-500/50 text-white text-xs font-black uppercase tracking-widest transition-all backdrop-blur-md"
            >
              Launch Generic Swarm
            </Link>
          </div>
        </motion.div>

        {/* HERO GRAPHIC: INTERACTIVE AGENT CANVAS */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative max-w-5xl mx-auto rounded-3xl border border-white/10 bg-slate-950/80 p-6 md:p-8 backdrop-blur-xl shadow-2xl shadow-blue-950/50 overflow-hidden"
        >
          <div className="flex items-center justify-between pb-6 mb-6 border-b border-white/10 text-xs font-mono">
            <div className="flex items-center gap-2 text-slate-400">
              <Terminal className="w-4 h-4 text-blue-400" />
              <span className="text-slate-300">orchestrator.swarms.nexus</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold flex items-center gap-1.5">
                <Activity className="w-3 h-3 animate-pulse" /> SWARM ACTIVE
              </span>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6 relative z-10">
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-blue-500/30 relative group hover:border-blue-500 transition-all shadow-lg">
              <div className="text-[10px] font-mono text-blue-400 mb-2 uppercase tracking-wider flex items-center justify-between">
                <span>01 // Webhook Input</span>
                <Globe className="w-3.5 h-3.5" />
              </div>
              <div className="font-bold text-sm mb-1 text-white">Regulatory Ingestion</div>
              <p className="text-xs text-slate-400">Ingesting cross-border policy updates from EU statutory databases.</p>
              <div className="mt-4 pt-3 border-t border-white/5 flex justify-between items-center text-[10px] font-mono text-slate-500">
                <span>Event: policy_update</span>
                <span className="text-emerald-400">200 OK</span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-gradient-to-b from-indigo-950/60 to-slate-900/80 border border-indigo-500/40 relative group hover:border-indigo-400 transition-all shadow-xl shadow-indigo-950/30">
              <div className="text-[10px] font-mono text-indigo-400 mb-2 uppercase tracking-wider flex items-center justify-between">
                <span>02 // Agent Swarm</span>
                <Zap className="w-3.5 h-3.5 text-indigo-400 animate-bounce" />
              </div>
              <div className="font-bold text-sm mb-1 text-white">Sentinel Reasoning</div>
              <p className="text-xs text-slate-400">Parsing statutory differences & auto-generating localized legal logic.</p>
              <div className="mt-4 pt-3 border-t border-white/5 flex justify-between items-center text-[10px] font-mono text-slate-500">
                <span>Latency: 18ms</span>
                <span className="text-indigo-400">Evaluating...</span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/80 border border-emerald-500/30 relative group hover:border-emerald-500 transition-all shadow-lg">
              <div className="text-[10px] font-mono text-emerald-400 mb-2 uppercase tracking-wider flex items-center justify-between">
                <span>03 // Automated Action</span>
                <Database className="w-3.5 h-3.5" />
              </div>
              <div className="font-bold text-sm mb-1 text-white">Database Sync</div>
              <p className="text-xs text-slate-400">Commit compliant contracts and alert regional officers via webhooks.</p>
              <div className="mt-4 pt-3 border-t border-white/5 flex justify-between items-center text-[10px] font-mono text-slate-500">
                <span>Status: Synced</span>
                <span className="text-emerald-400">100% Success</span>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* 4. TECH STACK TRUST BAR */}
      <section className="relative z-10 py-12 border-y border-white/[0.05] bg-white/[0.01]">
        <p className="text-center text-[9px] font-black text-slate-500 uppercase tracking-[0.4em] mb-8">
          Enterprise Infrastructure Integrations
        </p>
        <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 px-6 opacity-40 grayscale hover:grayscale-0 transition-all duration-500">
          {['Vercel', 'Node-js', 'Docker', 'Google Cloud', 'OpenAI', 'Neo4j'].map((tech) => (
            <span key={tech} className="font-black text-sm md:text-xl tracking-tighter text-white hover:text-blue-400 transition-colors">
              {tech.toUpperCase()}
            </span>
          ))}
        </div>
      </section>

      {/* 5. INTERACTIVE AGENTS SECTION */}
      <section className="relative z-10 px-6 py-28 bg-gradient-to-b from-transparent via-blue-950/10 to-transparent">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
            <div className="space-y-3">
              <div className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400 flex items-center gap-2">
                <Layers className="w-4 h-4" /> Targeted Business Operatives
              </div>
              <h2 className="text-3xl md:text-5xl font-black tracking-tighter">Specialised Agent Suites</h2>
              <p className="text-slate-400 font-medium max-w-xl text-sm leading-relaxed">
                Purpose-built digital operatives designed to handle specialized multi-step execution workflows out-of-the-box.
              </p>
            </div>
            <Link
              to="/agents"
              state={{ from: location.pathname }}
              className="text-xs font-black uppercase tracking-widest text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-2 border-b border-blue-400/20 pb-1 w-fit"
            >
              View Agent Directory <span>→</span>
            </Link>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <AnimatePresence mode="wait">
              {specialisedAgents.map((agent) => {
                const IconComponent = agent.icon;
                return (
                  <motion.div
                    key={agent.id}
                    layout
                    whileHover={{ y: -6 }}
                    onClick={() => setActiveTab(agent.id)}
                    className={`relative cursor-pointer p-8 md:p-10 rounded-[28px] bg-gradient-to-b from-slate-900/80 to-slate-900/30 border transition-all overflow-hidden backdrop-blur-md ${activeTab === agent.id ? "border-blue-500/60 shadow-2xl shadow-blue-950/40" : "border-white/10 hover:border-white/20"
                      }`}
                  >
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-3">
                        <div className={`p-3 rounded-xl bg-white/5 border border-white/10 ${agent.accent === 'emerald' ? 'text-emerald-400' : 'text-blue-400'}`}>
                          <IconComponent className="w-6 h-6" />
                        </div>
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-white/5 border border-white/10 ${agent.accent === 'emerald' ? 'text-emerald-400' : 'text-blue-400'}`}>
                          {agent.status}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 font-bold">SYS_ID // {agent.id.toUpperCase()}</span>
                    </div>

                    <h3 className={`text-2xl font-black tracking-tight mb-3 bg-gradient-to-r ${agent.color} bg-clip-text text-transparent`}>
                      {agent.title}
                    </h3>

                    <p className="text-slate-400 text-sm leading-relaxed mb-6 font-medium">
                      {agent.desc}
                    </p>

                    <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-slate-950/60 border border-white/5 mb-6 text-center font-mono">
                      <div>
                        <div className="text-[9px] text-slate-500 uppercase">Latency</div>
                        <div className="text-xs font-bold text-white">{agent.metrics.latency}</div>
                      </div>
                      <div>
                        <div className="text-[9px] text-slate-500 uppercase">Throughput</div>
                        <div className="text-xs font-bold text-white">{agent.metrics.throughput}</div>
                      </div>
                      <div>
                        <div className="text-[9px] text-slate-500 uppercase">Accuracy</div>
                        <div className="text-xs font-bold text-emerald-400">{agent.metrics.accuracy}</div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                      <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Sandboxed Runtime
                      </span>
                      <Link
                        to="/supportops/*"
                        state={{ from: location.pathname }}
                        className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white border border-white/10 text-white hover:text-slate-950 text-[11px] font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2"
                      >
                        Access System <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* 6. CALL TO ACTION */}
      <section className="relative z-10 px-6 py-20">
        <div className="max-w-5xl mx-auto rounded-[36px] bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 p-[1px] shadow-2xl shadow-blue-900/30">
          <div className="bg-[#020617] rounded-[35px] p-10 md:p-16 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-blue-600/5 pointer-events-none" />
            <h2 className="text-3xl md:text-5xl font-black mb-6 text-white tracking-tighter leading-tight">
              Ready to deploy your digital workforce?
            </h2>
            <p className="text-slate-400 text-sm max-w-xl mx-auto mb-8 font-medium">
              Join enterprise teams orchestrating AI agent swarms on Nexus Core.
            </p>
            <Link
              to="/register"
              state={{ from: location.pathname }}
              className="inline-flex items-center gap-2 px-10 py-4 rounded-xl bg-white text-slate-950 text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all shadow-xl"
            >
              Initiate Free Trial <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* 7. FOOTER */}
      <footer className="relative z-10 px-6 py-16 border-t border-white/5 bg-[#020617]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="text-center md:text-left">
            <div className="text-lg font-black tracking-tighter text-white mb-1">NEXUS CORE</div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">© {new Date().getFullYear()} Nexus Core Inc. All rights reserved.</p>
          </div>
          <nav className="flex flex-wrap justify-center gap-8 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
            <Link to="/docs" className="hover:text-white transition">Docs</Link>
            <Link to="/agents" className="hover:text-white transition">Specialised Agents</Link>
            <Link to="/architecture" className="hover:text-white transition">Architecture</Link>
            <Link to="/contact" className="hover:text-white transition">Contact</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}