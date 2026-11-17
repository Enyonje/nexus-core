import React from "react";
import { Helmet } from "react-helmet";
import { Link, useLocation } from "react-router-dom";

const ORIGIN = "https://nexusthecore.com";

const PAGES = {
  "/docs": {
    title: "Nexus Core Documentation | AI Agents and Workflows",
    description: "Explore Nexus Core product guidance, AI agent capabilities and business workflow coordination.",
    heading: "Nexus Core documentation",
    intro: "Find product information and guidance for exploring Nexus Core capabilities.",
    sections: [
      ["AI agent capabilities", "Learn how AI agents can support business tasks and coordinate work."],
      ["Workflow coordination", "Understand how multi-step workflows can be organised with execution visibility."],
      ["Permissions and oversight", "Explore the importance of access controls, human approvals and operational review."]
    ]
  },
  "/ai-agents": {
    title: "AI Agents for Business | Nexus Core",
    description: "Explore AI agents for business operations, workflow coordination and controlled task execution.",
    heading: "AI agents for business operations",
    intro: "Nexus Core brings AI agent capabilities into business workflows, helping teams coordinate tasks while retaining oversight.",
    sections: [
      ["Coordinate business tasks", "Use agent capabilities to support multi-step business processes."],
      ["Maintain human oversight", "Keep people involved in decisions that require review or approval."],
      ["Control tool access", "Define which tools and operations are available to agent workflows."]
    ]
  },
  "/workflow-automation": {
    title: "Business Workflow Automation | Nexus Core",
    description: "Coordinate business workflows with AI agents, approval processes and execution visibility.",
    heading: "Workflow automation with AI",
    intro: "Bring multi-step business processes together with AI-assisted coordination and appropriate human oversight.",
    sections: [
      ["Organise multi-step work", "Coordinate tasks across defined business processes."],
      ["Keep approval steps", "Retain review and approval points for actions that need human oversight."],
      ["Review execution", "Improve visibility into workflow activity and outcomes."]
    ]
  }
};

export default function SEOPillarPage() {
  const location = useLocation();
  const page = PAGES[location.pathname] || PAGES["/ai-agents"];
  const canonical = `${ORIGIN}${location.pathname}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: page.title,
    description: page.description,
    url: canonical,
    isPartOf: {
      "@type": "WebSite",
      name: "Nexus Core",
      url: `${ORIGIN}/`
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-24 text-slate-200">
      <Helmet>
        <title>{page.title}</title>
        <meta name="description" content={page.description} />
        <link rel="canonical" href={canonical} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={page.title} />
        <meta property="og:description" content={page.description} />
        <meta property="og:url" content={canonical} />
        <meta property="og:image" content={`${ORIGIN}/og-image.png`} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={page.title} />
        <meta name="twitter:description" content={page.description} />
        <meta name="twitter:image" content={`${ORIGIN}/og-image.png`} />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <div className="mx-auto max-w-5xl">
        <p className="mb-5 text-sm font-semibold uppercase tracking-widest text-indigo-400">
          Nexus Core
        </p>

        <h1 className="max-w-4xl text-4xl font-extrabold leading-tight text-white sm:text-6xl">
          {page.heading}
        </h1>

        <p className="mt-7 max-w-3xl text-lg leading-relaxed text-slate-400">
          {page.intro}
        </p>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {page.sections.map(([heading, description]) => (
            <section key={heading} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-7">
              <h2 className="text-xl font-bold text-white">{heading}</h2>
              <p className="mt-4 leading-relaxed text-slate-400">{description}</p>
            </section>
          ))}
        </div>

        <div className="mt-14 flex flex-wrap gap-4">
          <Link to="/agents" className="rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-500">
            Explore AI agents
          </Link>
          <Link to="/contact" className="rounded-xl border border-slate-700 px-6 py-3 font-semibold text-white hover:bg-slate-900">
            Contact the team
          </Link>
        </div>
      </div>
    </main>
  );
}
