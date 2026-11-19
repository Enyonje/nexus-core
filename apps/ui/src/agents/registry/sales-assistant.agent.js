import { defineAgent } from "../defineAgent.js";

export default defineAgent({
    slug: "sales-assistant",
    name: "Sales Assistant AI",
    category: "sales",
    status: "live",
    icon: "TrendingUp",
    accent: "emerald",
    product: "sales-assistant",
    order: 3,

    summary:
        "AI-powered sales operations, lead intelligence, pipeline management, marketing automation and SEO growth.",

    description:
        "Sales Assistant AI is an independently operated sales and revenue operations platform. It helps businesses discover and enrich leads, manage sales pipelines, coordinate AI-assisted outreach and follow-ups, automate sales workflows, and improve marketing performance. Its marketing capabilities include technical SEO, keyword and competitor research, content strategy, on-page optimization, local and programmatic SEO, backlink research, SEO audits, rank tracking and organic performance analytics. Sales Assistant AI maintains its own application, authentication, backend, database, API and deployment, separate from Nexus Core.",

    capabilities: [
        "Lead Discovery",
        "Lead Enrichment",
        "Sales Pipeline Management",
        "AI Outreach",
        "Automated Follow-ups",
        "Sales Workflow Automation",
        "Marketing Operations",
        "Technical SEO",
        "Keyword Research",
        "Competitor Intelligence",
        "Content Strategy",
        "SEO Performance Analytics"
    ],

    launch: {
        href: "https://salesassistant.nexusthecore.com/",
        label: "Launch Sales Assistant"
    }
});