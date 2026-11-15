import React, { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity, ArrowRight, Bot, Boxes, CheckCircle2, ChevronRight, Clock3,
  Command, Cpu, ExternalLink, Filter, Gauge, GitBranch, Layers3, Plug,
  Search, ShieldCheck, Sparkles, Workflow, Zap
} from "lucide-react";
import { AGENTS, CATEGORIES, STATUSES } from "../agents/index.js";
import { iconFor } from "../agents/icons.js";
import { ACCENT_STYLES } from "../agents/accents.js";

const SOCIALOPS_URL = (import.meta.env.VITE_SOCIALOPS_URL || "https://socialops.nexusthecore.com").replace(/\/$/, "");

const cx = (...parts) => parts.filter(Boolean).join(" ");

function normalizeAgent(agent) {
  const accent = ACCENT_STYLES[agent.accent] || ACCENT_STYLES.cyan || {};
  return {
    id: agent.slug,
    title: agent.name || agent.slug,
    category: agent.category || "general",
    status: STATUSES[agent.status] || agent.status || "Available",
    statusColor: accent.status || "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
    accentGlow: accent.glow || "from-cyan-500/10 to-blue-500/5",
    badgeColor: accent.title || "from-cyan-300 to-blue-300",
    Icon: iconFor(agent.icon) || Bot,
    path: agent.launch?.href || agent.launch?.to || `/agents/${agent.slug}`,
    detailPath: `/agents/${agent.slug}`,
    isLive: Boolean(agent.isLive),
    desc: agent.summary || "Specialized AI agent for Nexus Core workflows.",
    metrics: agent.metrics || {},
    capabilities: Array.isArray(agent.capabilities) ? agent.capabilities : [],
  };
}

const NAV_ITEMS = [
  { id: "overview", label: "Overview", icon: Gauge },
  { id: "directory", label: "Agent directory", icon: Bot },
  { id: "teams", label: "Agent teams", icon: Boxes },
  { id: "workflows", label: "Workflows", icon: Workflow },
  { id: "integrations", label: "Integrations", icon: Plug },
  { id: "activity", label: "Activity", icon: Activity },
];

function Metric({ label, value, detail, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-slate-900/65 p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-400">{label}</span>
        <span className="rounded-xl border border-white/10 bg-white/[0.04] p-2 text-cyan-300"><Icon size={17} /></span>
      </div>
      <div className="mt-4 text-3xl font-black tracking-tight text-white">{value}</div>
      <div className="mt-1 text-xs text-slate-500">{detail}</div>
    </div>
  );
}

function SectionHeading({ eyebrow, title, description, action }) {
  return (
    <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <div className="mb-2 text-[10px] font-black uppercase tracking-[.22em] text-cyan-300">{eyebrow}</div>
        <h2 className="text-2xl font-black tracking-tight text-white md:text-3xl">{title}</h2>
        {description && <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export default function AgentsDirectory() {
  const [activeSection, setActiveSection] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const location = useLocation();

  const agents = useMemo(() => AGENTS.map(normalizeAgent), []);
  const categories = useMemo(() => [
    { id: "all", label: "All agents" },
    ...Object.entries(CATEGORIES).filter(([id]) => agents.some((a) => a.category === id)).map(([id, label]) => ({ id, label })),
  ], [agents]);

  const filteredAgents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return agents.filter((agent) => {
      const categoryMatch = selectedCategory === "all" || agent.category === selectedCategory;
      const statusMatch = selectedStatus === "all" || (selectedStatus === "live" ? agent.isLive : !agent.isLive);
      const searchMatch = !query || [agent.title, agent.desc, agent.category, ...agent.capabilities]
        .join(" ").toLowerCase().includes(query);
      return categoryMatch && statusMatch && searchMatch;
    });
  }, [agents, searchQuery, selectedCategory, selectedStatus]);

  const liveCount = agents.filter((a) => a.isLive).length;
  const sectionTitle = NAV_ITEMS.find((item) => item.id === activeSection)?.label || "Overview";

  const launchAgent = (agent) => {
    if (agent.path.startsWith("https://")) window.open(agent.path, "_blank", "noopener,noreferrer");
  };

  const renderAgentCard = (agent) => {
    const Icon = agent.Icon;
    return (
      <motion.article
        key={agent.id}
        layout
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        className="group relative flex min-h-[330px] flex-col justify-between overflow-hidden rounded-3xl border border-white/[0.09] bg-gradient-to-b from-slate-900 to-slate-950 p-5 transition hover:-translate-y-1 hover:border-cyan-400/30 hover:shadow-2xl hover:shadow-cyan-950/30"
      >
        <div className={cx("pointer-events-none absolute inset-0 bg-gradient-to-br opacity-0 transition group-hover:opacity-100", agent.accentGlow)} />
        <div className="relative">
          <div className="mb-5 flex items-start justify-between">
            <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-3 text-cyan-300"><Icon size={23} /></div>
            <span className={cx("rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-wider", agent.statusColor)}>{agent.status}</span>
          </div>
          <div className="mb-1 text-[10px] font-bold uppercase tracking-[.16em] text-slate-500">{CATEGORIES[agent.category] || agent.category}</div>
          <h3 className={cx("bg-gradient-to-r bg-clip-text text-xl font-black text-transparent", agent.badgeColor)}>{agent.title}</h3>
          <p className="mt-3 min-h-[54px] text-xs leading-6 text-slate-400">{agent.desc}</p>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {agent.capabilities.slice(0, 5).map((cap) => (
              <span key={cap} className="rounded-lg border border-white/[0.07] bg-white/[0.03] px-2 py-1 text-[9px] text-slate-400">#{cap}</span>
            ))}
          </div>
        </div>
        <div className="relative mt-5 border-t border-white/[0.07] pt-4">
          <div className="mb-4 grid grid-cols-3 gap-2 text-center">
            <div><div className="text-[8px] uppercase tracking-wider text-slate-600">Latency</div><div className="mt-1 text-[11px] font-bold text-slate-200">{agent.metrics.latency || "—"}</div></div>
            <div><div className="text-[8px] uppercase tracking-wider text-slate-600">Throughput</div><div className="mt-1 text-[11px] font-bold text-slate-200">{agent.metrics.throughput || "—"}</div></div>
            <div><div className="text-[8px] uppercase tracking-wider text-slate-600">Accuracy</div><div className="mt-1 text-[11px] font-bold text-emerald-300">{agent.metrics.accuracy || "—"}</div></div>
          </div>
          <div className="flex gap-2">
            <Link to={agent.detailPath} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3 text-[10px] font-black uppercase tracking-wider text-slate-200 transition hover:bg-white/10">
              Details <ChevronRight size={14} />
            </Link>
            {agent.isLive && (agent.path.startsWith("https://") ? (
              <button onClick={() => launchAgent(agent)} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-cyan-500 px-3 py-3 text-[10px] font-black uppercase tracking-wider text-slate-950 transition hover:bg-cyan-300">Launch <ArrowRight size={14} /></button>
            ) : (
              <Link to={agent.path} state={{ from: location.pathname }} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-cyan-500 px-3 py-3 text-[10px] font-black uppercase tracking-wider text-slate-950 transition hover:bg-cyan-300">Launch <ArrowRight size={14} /></Link>
            ))}
          </div>
        </div>
      </motion.article>
    );
  };

  const renderOverview = () => (
    <>
      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Registered agents" value={agents.length} detail="Loaded from the agent registry" icon={Bot} />
        <Metric label="Launch-ready" value={liveCount} detail="Marked live in the registry" icon={CheckCircle2} />
        <Metric label="In development" value={agents.length - liveCount} detail="Preview and sandbox agents" icon={Clock3} />
        <Metric label="Connected platforms" value="1" detail="SocialOps integration entry point" icon={Plug} />
      </div>

      <div className="mb-8 grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <div className="relative overflow-hidden rounded-3xl border border-cyan-400/20 bg-gradient-to-br from-cyan-950/70 via-slate-900 to-indigo-950/60 p-7">
          <div className="absolute -right-12 -top-16 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" />
          <div className="relative">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-cyan-200"><Sparkles size={13} /> Nexus agent platform</div>
            <h2 className="max-w-xl text-3xl font-black leading-tight text-white md:text-4xl">One command centre for your AI workforce.</h2>
            <p className="mt-4 max-w-xl text-sm leading-6 text-slate-300">Discover specialist agents, open their workspaces and connect independent products into a coordinated operating environment.</p>
            <button onClick={() => setActiveSection("directory")} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-5 py-3 text-xs font-black uppercase tracking-wider text-slate-950 hover:bg-cyan-300">Explore agents <ArrowRight size={15} /></button>
          </div>
        </div>
        <div className="rounded-3xl border border-white/[0.08] bg-slate-900/60 p-6">
          <div className="flex items-center gap-2 text-sm font-bold text-white"><ShieldCheck size={17} className="text-emerald-300" /> Platform principles</div>
          <div className="mt-5 space-y-4">
            {[
              ["Independent services", "Products retain their own APIs, data and deployment."],
              ["Explicit launch states", "Only agents marked live are presented as launchable."],
              ["Secure integrations", "Connect through authenticated APIs, never shared databases."],
            ].map(([title, desc]) => <div key={title} className="border-l border-cyan-400/40 pl-4"><div className="text-xs font-bold text-slate-200">{title}</div><p className="mt-1 text-xs leading-5 text-slate-500">{desc}</p></div>)}
          </div>
        </div>
      </div>

      <SectionHeading eyebrow="Recommended" title="Start with your agent workforce" description="A quick view of the agents already registered in Nexus Core." action={<button onClick={() => setActiveSection("directory")} className="text-xs font-bold text-cyan-300 hover:text-cyan-200">View directory <ArrowRight size={13} className="ml-1 inline" /></button>} />
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {agents.slice(0, 3).map(renderAgentCard)}
      </div>
      <div className="mt-8 rounded-2xl border border-white/[0.08] bg-slate-900/50 p-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div><div className="font-bold text-white">Build a specialist agent</div><p className="mt-1 text-xs text-slate-400">Request a custom agent or tool integration for your organization.</p></div>
          <Link to="/contact" className="inline-flex items-center gap-2 self-start rounded-xl border border-white/10 px-4 py-2.5 text-xs font-bold text-slate-200 hover:bg-white/5">Request an agent <ArrowRight size={14} /></Link>
        </div>
      </div>
    </>
  );

  const renderDirectory = () => (
    <>
      <SectionHeading eyebrow="Discover and launch" title="Agent directory" description="Search the registered agent catalogue, filter by capability and open an agent's detail or launch page." />
      <div className="mb-6 space-y-4 rounded-2xl border border-white/[0.08] bg-slate-900/60 p-4">
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1"><Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} /><input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search agents, tasks or capabilities..." className="w-full rounded-xl border border-white/10 bg-slate-950 px-10 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/50" /></div>
          <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950 px-3 text-xs text-slate-400"><Filter size={14} /><select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className="bg-transparent py-3 text-slate-200 outline-none"><option value="all">All statuses</option><option value="live">Launch-ready</option><option value="preview">In development</option></select></label>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">{categories.map((cat) => <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className={cx("whitespace-nowrap rounded-xl px-3.5 py-2 text-[10px] font-black uppercase tracking-wider transition", selectedCategory === cat.id ? "bg-cyan-400 text-slate-950" : "bg-white/[0.04] text-slate-400 hover:bg-white/10 hover:text-white")}>{cat.label}</button>)}</div>
        <div className="text-[11px] text-slate-500">Showing <span className="font-bold text-slate-200">{filteredAgents.length}</span> of {agents.length} agents</div>
      </div>
      {filteredAgents.length ? <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3"><AnimatePresence mode="popLayout">{filteredAgents.map(renderAgentCard)}</AnimatePresence></div> : <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center"><Search className="mx-auto mb-3 text-slate-600" size={25} /><p className="font-bold text-white">No agents match those filters</p><button onClick={() => { setSearchQuery(""); setSelectedCategory("all"); setSelectedStatus("all"); }} className="mt-3 text-xs font-bold text-cyan-300">Clear filters</button></div>}
    </>
  );

  const renderSocialOps = () => (
    <div className="relative overflow-hidden rounded-3xl border border-fuchsia-400/20 bg-gradient-to-br from-fuchsia-950/40 via-slate-900 to-cyan-950/40 p-7 md:p-10">
      <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-fuchsia-500/10 blur-3xl" />
      <div className="relative grid gap-8 lg:grid-cols-[1.3fr_1fr] lg:items-center">
        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-fuchsia-300/20 bg-fuchsia-300/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-fuchsia-200"><Plug size={13} /> Independent product integration</div>
          <h2 className="text-4xl font-black tracking-tight text-white">SocialOps <span className="text-fuchsia-300">AI</span></h2>
          <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300">Your specialist social media operations platform for content planning, social account management, campaign workflows, publishing, engagement and analytics.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href={SOCIALOPS_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-fuchsia-400 px-5 py-3 text-xs font-black uppercase tracking-wider text-slate-950 hover:bg-fuchsia-300">Open SocialOps <ExternalLink size={14} /></a>
            <span className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-xs text-slate-300"><ShieldCheck size={14} className="text-emerald-300" /> Separate service boundary</span>
          </div>
          <p className="mt-4 break-all text-[10px] text-slate-500">Configured URL: {SOCIALOPS_URL}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            ["Content studio", "AI-assisted social content", Sparkles],
            ["Publishing", "Scheduling and publishing queue", Zap],
            ["Engagement", "Comments and community inbox", Activity],
            ["Analytics", "Performance and campaign insights", Gauge],
          ].map(([title, desc, Icon]) => <div key={title} className="rounded-2xl border border-white/10 bg-slate-950/50 p-4"><Icon size={19} className="text-fuchsia-300" /><div className="mt-3 text-sm font-bold text-white">{title}</div><p className="mt-1 text-xs leading-5 text-slate-500">{desc}</p></div>)}
        </div>
      </div>
    </div>
  );

  const renderComingSoon = (kind) => {
    const config = kind === "teams"
      ? { icon: Boxes, title: "Coordinate agent teams", desc: "Compose specialist agents into a team with defined roles, handoffs, shared context and an execution owner.", cards: [["Research → Strategy", "Research agent prepares evidence for a strategy agent."], ["Content → Review", "Content agent drafts assets for a human approval step."], ["Analytics → Optimization", "Analytics findings become optimization recommendations."]] }
      : kind === "workflows"
        ? { icon: Workflow, title: "Design multi-step workflows", desc: "Build repeatable processes that connect agents, approval gates and external tools.", cards: [["Trigger", "Start from a schedule, event or user request."], ["Agent steps", "Assign tasks to specialist agents with scoped context."], ["Approval and delivery", "Review outputs before permitted external actions."]] }
        : { icon: Activity, title: "Execution activity", desc: "This view is ready for execution history, run status, logs and usage data once the corresponding Nexus Core API endpoints are connected.", cards: [["Run history", "Recent executions and their outcomes."], ["Observability", "Latency, failures and provider health."], ["Audit trail", "Who initiated a run and which tools it used."]] };
    const Icon = config.icon;
    return <div><SectionHeading eyebrow={sectionTitle} title={config.title} description={config.desc} /><div className="rounded-3xl border border-cyan-400/15 bg-gradient-to-br from-cyan-950/30 to-slate-900/70 p-7"><div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-300"><Icon size={26} /></div><div className="grid gap-4 md:grid-cols-3">{config.cards.map(([title, desc], i) => <div key={title} className="rounded-2xl border border-white/10 bg-slate-950/60 p-5"><div className="mb-3 text-[10px] font-black uppercase tracking-widest text-cyan-300">Step 0{i + 1}</div><div className="font-bold text-white">{title}</div><p className="mt-2 text-xs leading-6 text-slate-500">{desc}</p></div>)}</div><div className="mt-6 flex items-start gap-3 rounded-xl border border-amber-300/15 bg-amber-300/[0.05] p-4"><Clock3 size={17} className="mt-0.5 shrink-0 text-amber-300" /><p className="text-xs leading-5 text-slate-400">This is a platform workspace shell, not a claim that orchestration or execution APIs are already implemented. The backend endpoints and persistence need to be connected before these controls can run real workflows.</p></div><Link to="/contact" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-xs font-black uppercase tracking-wider text-slate-950 hover:bg-slate-200">Discuss custom setup <ArrowRight size={14} /></Link></div></div>;
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050914] font-sans text-white selection:bg-cyan-400/30">
      <div className="pointer-events-none fixed inset-0"><div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b12_1px,transparent_1px),linear-gradient(to_bottom,#1e293b12_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_70%_50%_at_50%_0%,#000_70%,transparent_100%)]" /><div className="absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full bg-cyan-600/[0.08] blur-[150px]" /><div className="absolute -left-40 top-[45%] h-[450px] w-[450px] rounded-full bg-indigo-600/[0.08] blur-[150px]" /></div>
      <div className="relative mx-auto max-w-[1600px] px-4 pb-20 pt-8 sm:px-6 lg:px-8">
        <header className="mb-8 flex flex-col justify-between gap-5 border-b border-white/[0.08] pb-7 lg:flex-row lg:items-center">
          <div><div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[.24em] text-cyan-300"><Command size={13} /> Nexus Core / Agent Platform</div><h1 className="text-3xl font-black tracking-tight sm:text-4xl">Agent <span className="bg-gradient-to-r from-cyan-300 via-blue-300 to-violet-300 bg-clip-text text-transparent">Command Centre</span></h1><p className="mt-2 text-sm text-slate-400">Discover, launch and coordinate your digital workforce.</p></div>
          <div className="flex flex-wrap items-center gap-2"><div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/[0.06] px-3 py-2 text-[10px] font-bold text-emerald-300"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Registry loaded</div><div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[10px] font-semibold text-slate-400">{agents.length} registered agents</div></div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="h-fit rounded-2xl border border-white/[0.08] bg-slate-900/60 p-3 lg:sticky lg:top-6">
            <div className="px-3 pb-3 pt-2 text-[9px] font-black uppercase tracking-[.2em] text-slate-600">Workspace</div>
            <nav className="grid grid-cols-2 gap-1 lg:grid-cols-1">{NAV_ITEMS.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => setActiveSection(id)} className={cx("flex items-center gap-3 rounded-xl px-3 py-3 text-left text-xs font-bold transition", activeSection === id ? "bg-cyan-400/10 text-cyan-200 ring-1 ring-cyan-400/20" : "text-slate-400 hover:bg-white/[0.04] hover:text-white")}><Icon size={16} />{label}{activeSection === id && <ChevronRight size={14} className="ml-auto" />}</button>)}</nav>
            <div className="mt-5 rounded-xl border border-white/[0.07] bg-slate-950/70 p-4"><div className="flex items-center gap-2 text-xs font-bold text-white"><Cpu size={14} className="text-violet-300" /> Agent runtime</div><p className="mt-2 text-[10px] leading-5 text-slate-500">Registry-backed catalogue. Runtime health and execution metrics require live API telemetry.</p><div className="mt-3 flex items-center gap-2 text-[9px] font-bold uppercase tracking-wider text-amber-300"><Clock3 size={12} /> Telemetry not connected</div></div>
          </aside>

          <section className="min-w-0">
            <AnimatePresence mode="wait">
              <motion.div key={activeSection} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.16 }}>
                {activeSection === "overview" && renderOverview()}
                {activeSection === "directory" && renderDirectory()}
                {activeSection === "integrations" && <><SectionHeading eyebrow="Connected products" title="Integrations" description="Open independent Nexus products from one command centre. Each product retains its own backend, data store and deployment." />{renderSocialOps()}</>}
                {["teams", "workflows", "activity"].includes(activeSection) && renderComingSoon(activeSection)}
              </motion.div>
            </AnimatePresence>
          </section>
        </div>
        <footer className="mt-12 flex flex-col justify-between gap-2 border-t border-white/[0.07] pt-5 text-[10px] text-slate-600 sm:flex-row"><span>© {new Date().getFullYear()} Nexus Core Agent Platform</span><span className="inline-flex items-center gap-2"><Layers3 size={12} /> Independent services · Unified experience</span></footer>
      </div>
    </main>
  );
}
