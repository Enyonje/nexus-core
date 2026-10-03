import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
    ShieldCheck,
    Bot,
    Search,
    Sparkles,
    ArrowRight,
    Filter,
    Cpu,
    Zap,
    Terminal,
    Clock,
    Layers,
    Lock,
    Workflow,
    ExternalLink,
} from "lucide-react";

export default function AgentsDirectory() {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("all");
    const location = useLocation();

    const categories = [
        { id: "all", label: "All Operatives" },
        { id: "security", label: "Security & Legal" },
        { id: "support", label: "DevOps & Support" },
        { id: "finance", label: "FinTech & Payments" },
        { id: "analytics", label: "Data Intelligence" },
    ];

    const agents = [
        {
            id: "compliance",
            title: "Cross-Border Compliance System",
            category: "security",
            status: "Production Ready",
            statusColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
            accentGlow: "from-emerald-500/20 via-teal-500/10 to-transparent",
            badgeColor: "from-emerald-400 to-teal-500",
            icon: ShieldCheck,
            path: "/compliance",
            isLive: true,
            desc: "Real-time international statutory screening, localized regulatory risk mitigation, and automated cross-border legal checks.",
            metrics: { latency: "14ms", throughput: "12.4k/s", accuracy: "99.9%" },
            capabilities: [
                "Statutory Screening",
                "GDPR/HIPAA Auditing",
                "Auto-Remediation",
            ],
        },
        {
            id: "support",
            title: "Support-Ops AI",
            category: "support",
            status: "Beta Access",
            statusColor: "text-blue-400 bg-blue-500/10 border-blue-500/30",
            accentGlow: "from-blue-500/20 via-indigo-500/10 to-transparent",
            badgeColor: "from-blue-400 to-indigo-500",
            icon: Bot,
            path: "/supportops/*",
            isLive: true,
            desc: "Autonomous triage, self-healing integration setups, and SLA escalation tracking powered by internal engineering context.",
            metrics: { latency: "42ms", throughput: "3.1k/s", accuracy: "98.5%" },
            capabilities: [
                "Autonomous Triage",
                "Contextual Escalation",
                "API Health Sync",
            ],
        },
        {
            id: "sentra-cyber",
            title: "Sentra Graph Threat Sentinel",
            category: "security",
            status: "In Development",
            statusColor: "text-purple-400 bg-purple-500/10 border-purple-500/30",
            accentGlow: "from-purple-500/20 via-pink-500/10 to-transparent",
            badgeColor: "from-purple-400 to-pink-500",
            icon: Lock,
            path: "#",
            isLive: false,
            desc: "Graph-based cyber threat vector modeling using Neo4j to simulate zero-day attack paths before breach deployment.",
            metrics: { latency: "< 50ms", throughput: "Planned", accuracy: "Target 99.5%" },
            capabilities: [
                "Graph Attack Vectors",
                "Zero-Day Emulation",
                "SIEM Live Feeds",
            ],
        },
        {
            id: "settle-flow",
            title: "M-Pesa & Multi-Rail Settlement Swarm",
            category: "finance",
            status: "In Development",
            statusColor: "text-amber-400 bg-amber-500/10 border-amber-500/30",
            accentGlow: "from-amber-500/20 via-orange-500/10 to-transparent",
            badgeColor: "from-amber-400 to-orange-500",
            icon: Workflow,
            path: "#",
            isLive: false,
            desc: "High-throughput payment orchestration agent automating multi-currency clearing and webhook reconciliation.",
            metrics: { latency: "< 30ms", throughput: "Planned", accuracy: "Target 100%" },
            capabilities: [
                "Ledger Reconciliation",
                "Fallback Retry Swarm",
                "Fraud Shield",
            ],
        },
        {
            id: "data-mesh",
            title: "Self-Cleaning Data Mesh Operative",
            category: "analytics",
            status: "Roadmap Q4",
            statusColor: "text-slate-400 bg-slate-500/10 border-slate-500/30",
            accentGlow: "from-slate-500/20 via-cyan-500/10 to-transparent",
            badgeColor: "from-cyan-400 to-blue-500",
            icon: Layers,
            path: "#",
            isLive: false,
            desc: "Autonomous ETL pipeline optimizer that continuously cleans incoming unstructured data streams and corrects schema drifts.",
            metrics: { latency: "TBD", throughput: "TBD", accuracy: "Target 99.9%" },
            capabilities: [
                "Schema Drift Fix",
                "Anomaly Detection",
                "Automated Lineage",
            ],
        },
    ];

    const filteredAgents = agents.filter((agent) => {
        const matchesCategory =
            selectedCategory === "all" || agent.category === selectedCategory;
        const matchesSearch =
            agent.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            agent.desc.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    return (
        <div className="min-h-screen bg-[#020617] text-white selection:bg-blue-500/30 overflow-x-hidden font-sans relative pb-20">
            {/* BACKGROUND GRID & AMBIENT GLOWS */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
                <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-blue-600/10 blur-[160px] rounded-full" />
                <div className="absolute top-[40%] left-[-10%] w-[500px] h-[500px] bg-purple-600/10 blur-[160px] rounded-full" />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-6 pt-16">
                {/* HEADER SECTION */}
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 text-[10px] font-black tracking-[0.2em] uppercase mb-6 shadow-[0_0_20px_rgba(59,130,246,0.15)]">
                        <Sparkles className="w-3.5 h-3.5 text-blue-400" /> Specialised Agent Directory
                    </div>

                    <h1 className="text-4xl md:text-6xl font-black mb-6 tracking-tighter leading-tight text-white">
                        Autonomous Digital Operatives <br />
                        <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
                            Engineered for Enterprise
                        </span>
                    </h1>

                    <p className="text-sm md:text-base text-slate-400 font-medium leading-relaxed">
                        Discover production-ready specialized agents and preview upcoming autonomous swarms entering our execution sandbox.
                    </p>
                </div>

                {/* SEARCH AND CATEGORY FILTERS */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-12 bg-slate-900/60 p-3 rounded-2xl border border-white/10 backdrop-blur-xl">
                    {/* Categories */}
                    <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-none">
                        {categories.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat.id)}
                                className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${selectedCategory === cat.id
                                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                                    : "text-slate-400 hover:text-white hover:bg-white/5"
                                    }`}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>

                    {/* Search Box */}
                    <div className="relative w-full md:w-72">
                        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Filter agents..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-slate-950/80 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                        />
                    </div>
                </div>

                {/* AGENTS GRID */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <AnimatePresence>
                        {filteredAgents.map((agent) => {
                            const IconComp = agent.icon;
                            return (
                                <motion.div
                                    key={agent.id}
                                    layout
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ duration: 0.3 }}
                                    className="group relative flex flex-col justify-between rounded-3xl border border-white/10 bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-6 backdrop-blur-xl hover:border-blue-500/50 transition-all duration-300 overflow-hidden shadow-xl"
                                >
                                    {/* Subtle Background Radial Glow on Hover */}
                                    <div
                                        className={`absolute inset-0 bg-gradient-to-br ${agent.accentGlow} opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`}
                                    />

                                    <div>
                                        {/* Header Row */}
                                        <div className="flex items-start justify-between mb-5 relative z-10">
                                            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-white group-hover:scale-105 transition-transform">
                                                <IconComp className="w-6 h-6 text-blue-400" />
                                            </div>
                                            <span
                                                className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${agent.statusColor}`}
                                            >
                                                {agent.status}
                                            </span>
                                        </div>

                                        {/* Agent Title */}
                                        <h3
                                            className={`text-xl font-black tracking-tight mb-2 bg-gradient-to-r ${agent.badgeColor} bg-clip-text text-transparent`}
                                        >
                                            {agent.title}
                                        </h3>

                                        {/* Description */}
                                        <p className="text-slate-400 text-xs leading-relaxed mb-6 font-medium">
                                            {agent.desc}
                                        </p>

                                        {/* Capabilities Tags */}
                                        <div className="flex flex-wrap gap-1.5 mb-6">
                                            {agent.capabilities.map((cap) => (
                                                <span
                                                    key={cap}
                                                    className="px-2.5 py-1 rounded-md bg-slate-900 border border-white/5 text-[9px] font-mono text-slate-400"
                                                >
                                                    #{cap}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Metrics & Action Footer */}
                                    <div className="relative z-10 pt-4 border-t border-white/5">
                                        <div className="grid grid-cols-3 gap-1 mb-5 p-2.5 rounded-xl bg-slate-950/70 border border-white/5 font-mono text-center">
                                            <div>
                                                <div className="text-[8px] uppercase text-slate-500">Latency</div>
                                                <div className="text-[11px] font-bold text-white">{agent.metrics.latency}</div>
                                            </div>
                                            <div>
                                                <div className="text-[8px] uppercase text-slate-500">Throughput</div>
                                                <div className="text-[11px] font-bold text-white">{agent.metrics.throughput}</div>
                                            </div>
                                            <div>
                                                <div className="text-[8px] uppercase text-slate-500">Accuracy</div>
                                                <div className="text-[11px] font-bold text-emerald-400">{agent.metrics.accuracy}</div>
                                            </div>
                                        </div>

                                        {agent.isLive ? (
                                            <Link
                                                to={agent.path}
                                                state={{ from: location.pathname }}
                                                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 group-hover:shadow-blue-500/40"
                                            >
                                                Launch Operative <ArrowRight className="w-3.5 h-3.5" />
                                            </Link>
                                        ) : (
                                            <button
                                                disabled
                                                className="w-full py-3 rounded-xl bg-slate-800/50 border border-white/5 text-slate-500 text-[11px] font-black uppercase tracking-widest cursor-not-allowed flex items-center justify-center gap-2"
                                            >
                                                <Clock className="w-3.5 h-3.5" /> In Sandbox Pipeline
                                            </button>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>

                {/* FUTURE ROADMAP BANNER */}
                <div className="mt-16 rounded-3xl border border-white/10 bg-gradient-to-r from-blue-950/30 via-slate-900/60 to-purple-950/30 p-8 md:p-12 text-center relative overflow-hidden backdrop-blur-xl">
                    <div className="max-w-2xl mx-auto relative z-10">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-slate-400 mb-4">
                            <Cpu className="w-3.5 h-3.5 text-blue-400" /> Custom Operative Requests
                        </div>
                        <h2 className="text-2xl md:text-4xl font-black mb-4 tracking-tight">
                            Need a Custom Agent for Your Infrastructure?
                        </h2>
                        <p className="text-slate-400 text-xs md:text-sm font-medium mb-6">
                            Our Sentinel Sandbox allows custom fine-tuning and tool execution bindings for enterprise clients.
                        </p>
                        <Link
                            to="/contact"
                            state={{ from: location.pathname }}
                            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-white text-slate-950 text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all shadow-xl"
                        >
                            Request Custom Swarm <ExternalLink className="w-4 h-4" />
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}