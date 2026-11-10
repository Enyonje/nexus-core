import React from "react";
import { Link } from "react-router-dom";

const pages = {
  "/ai-agents": {
    title: "AI Agents for Business Workflows | Nexus Core",
    description: "Explore Nexus Core AI agents for business workflows, with tool access, approval gates, spending limits and auditable execution.",
    eyebrow: "Nexus Core platform",
    heading: "AI agents built to help teams get real work done",
    intro: "Nexus Core brings agent-driven task execution into business workflows. Define the work, connect approved tools and keep people in control with review gates and an execution trail.",
    points: ["Connect agents to approved tools and workflows", "Use human approval gates for sensitive actions", "Apply spending limits and review execution history"],
    cta: "Explore the platform", href: "/agents",
  },
  "/workflow-automation": {
    title: "AI Workflow Automation Software | Nexus Core",
    description: "Coordinate business workflows with AI agents, approved tool access, human review gates and execution visibility from Nexus Core.",
    eyebrow: "Workflow automation",
    heading: "Automate workflows without losing oversight",
    intro: "Nexus Core helps teams coordinate multi-step work with AI agents while retaining control over tool permissions, approvals, budgets and execution history.",
    points: ["Map repeatable work into agent-led steps", "Require review before consequential actions", "Keep an auditable record of agent activity"],
    cta: "Browse AI agents", href: "/agents",
  },
  "/supportops/whatsapp-automation": {
    title: "WhatsApp Customer Support Automation | SupportOps AI",
    description: "Explore SupportOps AI for customer-support workflows across connected channels, including WhatsApp where configured, with ticket triage and team oversight.",
    eyebrow: "SupportOps AI",
    heading: "Bring WhatsApp conversations into an organised support workflow",
    intro: "SupportOps is designed to help support teams organise incoming customer conversations, triage tickets and coordinate agent follow-up. WhatsApp availability depends on a configured channel connection.",
    points: ["Bring supported channels into a coordinated support workflow", "Triage and prioritise incoming support requests", "Keep people involved in review and escalation"],
    cta: "Explore SupportOps demo", href: "/supportops/demo",
  },
};

export default function CommercialLandingPage({ path }) {
  const page = pages[path] || pages["/ai-agents"];
  return <main className="min-h-screen bg-slate-950 px-6 py-20 text-white">
    <div className="mx-auto max-w-5xl">
      <p className="text-sm font-semibold uppercase tracking-[.2em] text-cyan-400">{page.eyebrow}</p>
      <h1 className="mt-5 max-w-4xl text-4xl font-bold leading-tight md:text-6xl">{page.heading}</h1>
      <p className="mt-7 max-w-3xl text-lg leading-8 text-slate-300">{page.intro}</p>
      <section className="mt-12 grid gap-4 md:grid-cols-3" aria-label="Platform capabilities">
        {page.points.map((point) => <article key={point} className="rounded-2xl border border-white/10 bg-white/5 p-6"><h2 className="font-semibold leading-7">{point}</h2></article>)}
      </section>
      <div className="mt-12 flex flex-wrap gap-4">
        <Link to={page.href} className="rounded-xl bg-cyan-500 px-6 py-3 font-semibold text-slate-950 hover:bg-cyan-400">{page.cta}</Link>
        <Link to="/contact" className="rounded-xl border border-white/20 px-6 py-3 font-semibold hover:bg-white/5">Talk to the team</Link>
      </div>
    </div>
  </main>;
}

export { pages as COMMERCIAL_SEO_PAGES };
