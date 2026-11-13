import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { getAgent, CATEGORIES, STATUSES } from "../agents/index.js";
import { iconFor } from "../agents/icons.js";
import { ACCENT_STYLES } from "../agents/accents.js";
import { PRODUCTS } from "../auth/products";

/** Generated page for every agent in src/agents/registry: /agents/<slug>. */
export default function AgentDetail() {
  const { slug } = useParams();
  const agent = getAgent(slug);
  if (!agent) return <Navigate to="/agents" replace />;
  const Icon = iconFor(agent.icon);
  const accent = ACCENT_STYLES[agent.accent] || ACCENT_STYLES.cyan;
  const product = PRODUCTS[agent.product];
  const launch = agent.launch;

  return (
    <main className="min-h-screen bg-[#020617] px-6 pb-24 pt-14 text-white">
      <div className="mx-auto max-w-4xl">
        <Link to="/agents" className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-white"><ArrowLeft className="h-4 w-4" /> All agents</Link>
        <div className="mt-8 flex items-start gap-5">
          <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/5"><Icon className="h-8 w-8 text-cyan-300" /></span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-wider ${accent.status}`}>{STATUSES[agent.status]}</span>
              <span className="text-[11px] text-slate-500">{CATEGORIES[agent.category]}</span>
            </div>
            <h1 className={`mt-3 bg-gradient-to-r bg-clip-text text-4xl font-black tracking-tight text-transparent ${accent.title}`}>{agent.name}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">{agent.description || agent.summary}</p>
          </div>
        </div>

        <section className="mt-10 grid gap-6 md:grid-cols-[1.4fr_1fr]">
          <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">Capabilities</h2>
            <ul className="mt-4 space-y-2">
              {agent.capabilities.map((c) => <li key={c} className="flex gap-2 text-sm"><Check className="mt-0.5 h-4 w-4 text-cyan-300" />{c}</li>)}
            </ul>
          </div>
          <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 font-mono">
            <h2 className="font-sans text-sm font-bold uppercase tracking-wider text-slate-400">Benchmarks</h2>
            {Object.entries(agent.metrics).map(([k, v]) => (
              <div key={k} className="mt-3 flex justify-between text-sm"><span className="capitalize text-slate-500">{k}</span><span>{v}</span></div>
            ))}
          </div>
        </section>

        <div className="mt-10 flex flex-wrap items-center gap-3">
          {agent.isLive && launch ? (
            launch.href ? (
              <a href={launch.href} className="inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-6 py-3 text-sm font-bold text-slate-950 hover:bg-cyan-200">{launch.label || "Launch"} <ArrowRight className="h-4 w-4" /></a>
            ) : (
              <Link to={launch.to} className="inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-6 py-3 text-sm font-bold text-slate-950 hover:bg-cyan-200">{launch.label || "Launch"} <ArrowRight className="h-4 w-4" /></Link>
            )
          ) : (
            <Link to="/contact" state={{ agent: agent.slug }} className="rounded-xl border border-white/15 px-6 py-3 text-sm font-semibold hover:bg-white/5">Request early access</Link>
          )}
          {product?.paths?.pricing && <Link to={product.paths.pricing} className="text-sm text-cyan-300 hover:underline">See {product.name} pricing</Link>}
        </div>
        {product && agent.product !== "nexus-core" && <p className="mt-4 text-xs text-slate-500">{agent.name} uses its own {product.name} account, separate from your Nexus Core sign-in.</p>}
      </div>
    </main>
  );
}
