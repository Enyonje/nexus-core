import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  TrendingUp,
  Target,
  Headset,
  Sparkles,
  CheckCircle2,
  Zap,
  ShieldCheck,
  Eye,
  Lock,
  Building2,
  CalendarCheck,
  MessageSquareMore,
  Share2,
} from "lucide-react";

const PRODUCTS = [
  {
    id: "socialops",
    name: "SocialOps",
    role: "Your AI marketing team",
    badge: "MARKETING & GROWTH",
    description:
      "Plan, create and coordinate social media operations to keep your brand active and consistent.",
    path: "/agents",
    icon: TrendingUp,
    accent: "text-violet-300",
    bg: "bg-violet-400/10",
    border: "border-violet-400/25",
    pill: "bg-violet-400/15 text-violet-200 border-violet-400/30",
    highlights: [
      "Content planning & consistent publishing cadence",
      "Coordinated campaign & channel execution",
      "Always-on brand visibility without manual bottleneck",
    ],
    previewItems: [
      { label: "Content Calendar", status: "Scheduled · Multi-Channel" },
      { label: "Campaign Coordination", status: "Active · Daily Cadence" },
      { label: "Brand Consistency", status: "Automated Drafts & Queue" },
    ],
  },
  {
    id: "sales-assistant",
    name: "Sales Assistant AI",
    role: "Your AI sales assistant",
    badge: "REVENUE & PIPELINE",
    description:
      "Support lead discovery, qualification, sales conversations and follow-up workflows.",
    path: "/agents",
    icon: Target,
    accent: "text-cyan-300",
    bg: "bg-cyan-400/10",
    border: "border-cyan-400/25",
    pill: "bg-cyan-400/15 text-cyan-200 border-cyan-400/30",
    highlights: [
      "Lead discovery & structured prospect qualification",
      "Consistent sales conversation & reply support",
      "Automated follow-up workflows so leads never go cold",
    ],
    previewItems: [
      { label: "Lead Discovery & Scoring", status: "High-Intent Prospects Queued" },
      { label: "Sales Conversations", status: "Instant Qualification Ready" },
      { label: "Follow-Up Workflows", status: "Automated Cadence Active" },
    ],
  },
  {
    id: "supportops",
    name: "SupportOps",
    role: "Your AI customer support workspace",
    badge: "CUSTOMER EXPERIENCE",
    description:
      "Coordinate customer support operations, ticket workflows and escalation visibility.",
    path: "/supportops",
    icon: Headset,
    accent: "text-emerald-300",
    bg: "bg-emerald-400/10",
    border: "border-emerald-400/25",
    pill: "bg-emerald-400/15 text-emerald-200 border-emerald-400/30",
    highlights: [
      "Centralized support operations & ticket workflows",
      "Clear escalation visibility for urgent issues",
      "Faster, structured resolution across customer queues",
    ],
    previewItems: [
      { label: "Ticket Workflows", status: "Triaged & Routed Automatically" },
      { label: "Escalation Visibility", status: "Real-Time SLA & Priority View" },
      { label: "Support Operations", status: "Unified Team Workspace" },
    ],
  },
];

const GOVERNANCE_PILLARS = [
  {
    title: "Controlled Tool Access",
    description:
      "Every AI agent operates inside strict permission boundaries with scoped API credentials and workspace isolation.",
    icon: Lock,
    accent: "text-cyan-300",
    bg: "bg-cyan-400/10",
  },
  {
    title: "Human Approvals & Governance",
    description:
      "Configure human-in-the-loop checkpoints before external emails, social posts, or sensitive escalations execute.",
    icon: ShieldCheck,
    accent: "text-emerald-300",
    bg: "bg-emerald-400/10",
  },
  {
    title: "Execution Visibility",
    description:
      "Monitor real-time workflow runs, ticket escalations, and audit logs across SocialOps, Sales Assistant AI, and SupportOps.",
    icon: Eye,
    accent: "text-violet-300",
    bg: "bg-violet-400/10",
  },
];

const segments = [
  {
    name: "Digital agencies",
    focus: "Consistent client marketing, lead follow-ups & account support",
    icon: Share2,
  },
  {
    name: "Professional services",
    focus: "Inbound lead qualification, proposal follow-ups & client care",
    icon: CalendarCheck,
  },
  {
    name: "E-commerce & retail",
    focus: "Active social promotion, buyer questions & order support tickets",
    icon: MessageSquareMore,
  },
  {
    name: "B2B & trade companies",
    focus: "Prospect outreach, partner follow-ups & inquiry escalation",
    icon: Building2,
  },
  {
    name: "Growing SMEs",
    focus: "Lean operations across marketing, sales & customer support",
    icon: Zap,
  },
  {
    name: "Online businesses",
    focus: "24/7 customer responsiveness without scaling headcount first",
    icon: Sparkles,
  },
];

export default function LandingPage() {
  const location = useLocation();
  const [selectedProductId, setSelectedProductId] = useState("socialops");

  const activeProduct =
    PRODUCTS.find((p) => p.id === selectedProductId) || PRODUCTS[0];
  const ActiveIcon = activeProduct.icon;

  useEffect(() => {
    const title = "Nexus Core | AI Agents & Business Workflow Automation";
    const description =
      "Coordinate AI agents and business workflows with controlled tool access, human approvals and execution visibility. Explore Nexus Core.";
    const canonicalUrl = "https://nexusthecore.com/";

    document.title = title;

    const setMeta = (attr, key, content) => {
      let tag = document.querySelector(`meta[${attr}="${key}"]`);
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute(attr, key);
        document.head.appendChild(tag);
      }
      tag.setAttribute("content", content);
    };

    setMeta("name", "description", description);
    setMeta("property", "og:title", title);
    setMeta("property", "og:description", description);
    setMeta("property", "og:url", canonicalUrl);
    setMeta("property", "og:type", "website");

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", canonicalUrl);
  }, []);

  return (
    <div className="min-h-screen overflow-hidden bg-[#07111f] font-sans text-white selection:bg-cyan-400/30">
      {/* Ambient Background */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#94a3b808_1px,transparent_1px),linear-gradient(to_bottom,#94a3b808_1px,transparent_1px)] bg-[size:4rem_4rem]" />
        <div className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-cyan-500/10 blur-[140px]" />
        <div className="absolute -right-40 top-[35%] h-[520px] w-[520px] rounded-full bg-blue-600/10 blur-[150px]" />
      </div>

      {/* Header (Uses <span> for brand logo, never <h1>) */}
      <header className="relative z-20 mx-auto flex max-w-7xl items-center justify-between border-b border-white/[0.07] px-5 py-5 md:px-8">
        <Link to="/" className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 text-xl font-black text-slate-950 shadow-lg shadow-cyan-950/40">
            N
          </span>
          <span className="text-lg font-black tracking-tight">
            Nexus<span className="text-cyan-300">Core</span>
            <small className="mt-0.5 block text-[8px] font-bold uppercase tracking-[.22em] text-slate-500">
              AI business ecosystem
            </small>
          </span>
        </Link>

        <nav
          aria-label="Primary Navigation"
          className="hidden items-center gap-8 text-[11px] font-bold text-slate-400 md:flex"
        >
          <a href="#products" className="hover:text-white">
            Products
          </a>
          <a href="#governance" className="hover:text-white">
            Governance
          </a>
          <a href="#businesses" className="hover:text-white">
            Who it&apos;s for
          </a>
          <Link to="/agents" className="hover:text-white">
            Marketplace
          </Link>
          <Link to="/pricing" className="hover:text-white">
            Pricing
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            to="/login"
            state={{ from: location.pathname }}
            className="hidden rounded-xl px-4 py-2.5 text-[10px] font-bold text-slate-300 hover:bg-white/5 sm:block"
          >
            Log in
          </Link>
          <Link
            to="/register"
            className="rounded-xl bg-cyan-400 px-4 py-3 text-[10px] font-black text-slate-950 hover:bg-cyan-300"
          >
            Get started <ArrowUpRight size={13} className="ml-1 inline" />
          </Link>
        </div>
      </header>

      <main className="relative z-10">
        {/* HERO SECTION — Contains the SOLE <h1> on the page */}
        <section className="mx-auto grid max-w-7xl items-center gap-12 px-5 pb-20 pt-16 md:px-8 md:pb-24 md:pt-24 lg:grid-cols-[1.05fr_.95fr]">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/[0.07] px-3.5 py-2 text-[9px] font-black uppercase tracking-[.2em] text-cyan-200">
              <Sparkles size={12} /> SocialOps · Sales Assistant AI · SupportOps
            </span>

            <h1 className="mt-6 max-w-3xl text-4xl font-black leading-[1.04] tracking-[-.04em] sm:text-5xl md:text-6xl">
              AI Agents &amp;{" "}
              <span className="bg-gradient-to-r from-cyan-300 via-blue-300 to-violet-300 bg-clip-text text-transparent">
                Business Workflow Automation
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-7 text-slate-300">
              Coordinate AI agents and business workflows with controlled tool access, human approvals and execution visibility. Run{" "}
              <strong className="text-white">SocialOps</strong>,{" "}
              <strong className="text-white">Sales Assistant AI</strong>, and{" "}
              <strong className="text-white">SupportOps</strong> in one connected workspace.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="#products"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-400 px-7 py-4 text-[11px] font-black uppercase tracking-wider text-slate-950 shadow-xl shadow-cyan-950/30 hover:bg-cyan-300"
              >
                Explore solutions <ArrowRight size={15} />
              </a>
              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.03] px-7 py-4 text-[11px] font-bold uppercase tracking-wider text-white hover:bg-white/[0.08]"
              >
                Start free workspace <ArrowUpRight size={14} />
              </Link>
            </div>

            <div className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-[11px] font-semibold text-slate-400">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-cyan-300" /> Controlled tool access
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-cyan-300" /> Human approvals
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-cyan-300" /> Execution visibility
              </span>
            </div>
          </motion.div>

          {/* INTERACTIVE PRODUCT WORKSPACE PREVIEW */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="relative"
          >
            <div className="absolute inset-8 rounded-full bg-cyan-400/10 blur-[85px]" />
            <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[#0b1a2c]/95 p-5 shadow-2xl shadow-black/50 backdrop-blur-xl md:p-7">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[.2em] text-cyan-300">
                    NexusCore Product Suite
                  </p>
                  <p className="mt-1 text-lg font-black text-white">
                    Choose a product to preview
                  </p>
                </div>
                <span className="rounded-lg border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-1 text-[9px] font-black text-emerald-300">
                  3 CORE PRODUCTS
                </span>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                {PRODUCTS.map((prod) => {
                  const isSelected = prod.id === selectedProductId;
                  return (
                    <button
                      key={prod.id}
                      type="button"
                      onClick={() => setSelectedProductId(prod.id)}
                      className={`rounded-xl border px-3 py-2.5 text-left transition ${isSelected
                        ? "border-cyan-400/50 bg-cyan-400/15 text-white"
                        : "border-white/[0.07] bg-white/[0.02] text-slate-400 hover:bg-white/[0.05] hover:text-white"
                        }`}
                    >
                      <p className="truncate text-xs font-black">{prod.name}</p>
                      <p className="mt-0.5 truncate text-[9px] text-slate-400">
                        {prod.badge}
                      </p>
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 rounded-2xl border border-white/[0.08] bg-[#07111f] p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className={`rounded-xl p-3 ${activeProduct.bg} ${activeProduct.accent}`}>
                      <ActiveIcon size={20} />
                    </span>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {activeProduct.role}
                      </p>
                      <p className="text-lg font-black text-white">
                        {activeProduct.name}
                      </p>
                    </div>
                  </div>
                  <Link
                    to={activeProduct.path}
                    className="inline-flex items-center gap-1 rounded-lg bg-cyan-400 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-950 hover:bg-cyan-300"
                  >
                    Explore solution <ArrowUpRight size={12} />
                  </Link>
                </div>

                <p className="mt-3.5 text-xs leading-6 text-slate-300">
                  {activeProduct.description}
                </p>

                <div className="mt-4 space-y-2 border-t border-white/[0.07] pt-4">
                  {activeProduct.previewItems.map((row) => (
                    <div
                      key={row.label}
                      className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-2.5 text-xs"
                    >
                      <span className="font-semibold text-slate-200">{row.label}</span>
                      <span className={`text-[10px] font-bold ${activeProduct.accent}`}>
                        {row.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* CORE PRODUCTS SHOWCASE (H2 -> H3 Hierarchy) */}
        <section
          id="products"
          className="border-y border-white/[0.06] bg-white/[0.015] px-5 py-20 md:px-8"
        >
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[.24em] text-cyan-300">
                  Core AI Products
                </p>
                <h2 className="mt-2.5 text-3xl font-black tracking-tight md:text-4xl">
                  Built for marketing, sales &amp; support workflows.
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400">
                  Pick the exact product your business needs right now—or run all three together as one connected operating system.
                </p>
              </div>
              <Link
                to="/agents"
                className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-cyan-300 hover:text-cyan-200"
              >
                Browse all solutions <ArrowRight size={14} />
              </Link>
            </div>

            <div className="mt-10 grid gap-5 lg:grid-cols-3">
              {PRODUCTS.map((product) => {
                const Icon = product.icon;
                return (
                  <article
                    key={product.id}
                    className={`flex flex-col justify-between rounded-2xl border ${product.border} bg-[#0b192a] p-6 transition hover:-translate-y-1 hover:bg-[#0f2138]`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className={`rounded-xl p-3 ${product.bg} ${product.accent}`}>
                          <Icon size={22} />
                        </span>
                        <span
                          className={`rounded-full border px-3 py-1 text-[9px] font-black tracking-wider ${product.pill}`}
                        >
                          {product.badge}
                        </span>
                      </div>

                      <p className="mt-5 text-[10px] font-bold uppercase tracking-[.16em] text-slate-400">
                        {product.role}
                      </p>
                      <h3 className="mt-1 text-2xl font-black text-white">
                        {product.name}
                      </h3>
                      <p className="mt-3 text-sm leading-6 text-slate-300">
                        {product.description}
                      </p>

                      <ul className="mt-5 space-y-2.5 border-t border-white/[0.08] pt-4">
                        {product.highlights.map((pt) => (
                          <li key={pt} className="flex items-start gap-2 text-xs text-slate-400">
                            <CheckCircle2
                              size={14}
                              className={`mt-0.5 shrink-0 ${product.accent}`}
                            />
                            <span>{pt}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="mt-7 border-t border-white/[0.08] pt-4">
                      <Link
                        to={product.path}
                        className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-cyan-300 hover:text-cyan-200"
                      >
                        Explore solution <ArrowUpRight size={15} />
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* GOVERNANCE & ARCHITECTURE SECTION — Matches Meta Description H2s */}
        <section id="governance" className="mx-auto max-w-7xl px-5 py-20 md:px-8">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <p className="text-[9px] font-black uppercase tracking-[.24em] text-cyan-300">
              Enterprise Control &amp; Architecture
            </p>
            <p className="mt-3 text-3xl font-black tracking-tight md:text-4xl">
              Safe, auditable AI execution.
            </p>
            <p className="mt-3 text-sm leading-7 text-slate-400">
              Every workflow in Nexus Core is built with clear operational guardrails so your team stays in command.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {GOVERNANCE_PILLARS.map(({ title, description, icon: Icon, accent, bg }) => (
              <article
                key={title}
                className="rounded-2xl border border-white/[0.08] bg-[#0b192a] p-6"
              >
                <span className={`inline-flex rounded-xl p-3 ${bg} ${accent}`}>
                  <Icon size={21} />
                </span>
                <h2 className="mt-5 text-xl font-black text-white">{title}</h2>
                <p className="mt-3 text-xs leading-6 text-slate-400">{description}</p>
              </article>
            ))}
          </div>
        </section>

        {/* WHO IT'S FOR */}
        <section
          id="businesses"
          className="border-y border-white/[0.06] bg-[#0a1727] px-5 py-20 md:px-8"
        >
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[.85fr_1.15fr] lg:items-center">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[.24em] text-cyan-300">
                Built for growing businesses
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">
                Any business model.<br />Your AI team at work.
              </h2>
              <p className="mt-4 text-sm leading-7 text-slate-400">
                Whether you are generating leads, closing deals, or handling daily customer tickets, Nexus Core gives you practical AI products built for real execution.
              </p>
              <Link
                to="/register"
                className="mt-7 inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-6 py-3.5 text-[11px] font-black uppercase tracking-wider text-slate-950 hover:bg-cyan-300"
              >
                Create your workspace <ArrowRight size={14} />
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
              {segments.map(({ name, focus, icon: Icon }, i) => (
                <div
                  key={name}
                  className="flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5"
                >
                  <Icon
                    size={18}
                    className={i % 2 === 0 ? "text-cyan-300" : "text-violet-300"}
                  />
                  <div className="mt-4">
                    <h3 className="text-sm font-bold text-white">{name}</h3>
                    <p className="mt-1.5 text-xs leading-5 text-slate-400">{focus}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* BOTTOM CTA */}
        <section className="mx-auto max-w-7xl px-5 py-20 md:px-8">
          <div className="relative overflow-hidden rounded-[28px] border border-cyan-300/20 bg-gradient-to-br from-[#12314a] via-[#10243b] to-[#161d38] px-6 py-14 text-center md:px-12">
            <div className="absolute -right-20 -top-32 h-72 w-72 rounded-full bg-cyan-300/10 blur-3xl" />
            <div className="relative mx-auto max-w-2xl">
              <span className="inline-flex items-center gap-2 text-[9px] font-black uppercase tracking-[.2em] text-cyan-200">
                <Zap size={13} /> SocialOps · Sales Assistant AI · SupportOps
              </span>
              <h2 className="mt-4 text-3xl font-black tracking-tight md:text-5xl">
                Turn attention into revenue and calm operations.
              </h2>
              <p className="mt-5 text-sm leading-7 text-slate-300">
                Start with SocialOps, Sales Assistant AI, or SupportOps today and build a smoother workflow across your business.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Link
                  to="/register"
                  className="rounded-xl bg-cyan-400 px-7 py-4 text-[11px] font-black uppercase tracking-wider text-slate-950 hover:bg-cyan-300"
                >
                  Get started free <ArrowRight size={14} className="ml-1 inline" />
                </Link>
                <Link
                  to="/pricing"
                  className="rounded-xl border border-white/15 px-7 py-4 text-[11px] font-bold uppercase tracking-wider text-white hover:bg-white/5"
                >
                  Explore pricing
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/[0.07] px-5 py-8 md:px-8">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 text-[11px] text-slate-500 sm:flex-row">
          <span>
            © {new Date().getFullYear()} Nexus Core. AI Agents &amp; Business Workflow Automation.
          </span>
          <div className="flex gap-5">
            <Link to="/agents" className="hover:text-slate-300">
              Agents
            </Link>
            <Link to="/supportops" className="hover:text-slate-300">
              SupportOps
            </Link>
            <Link to="/pricing" className="hover:text-slate-300">
              Pricing
            </Link>
            <Link to="/contact" className="hover:text-slate-300">
              Contact
            </Link>
            <Link to="/privacy-policy" className="hover:text-slate-300">
              Privacy
            </Link>
            <Link to="/terms-of-service" className="hover:text-slate-300">
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}