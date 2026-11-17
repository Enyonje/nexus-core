import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = path.resolve("dist");
const origin = "https://nexusthecore.com";

const routes = [
  {
    path: "/",
    title: "Nexus Core | AI Agents & Business Workflow Automation",
    description: "Coordinate AI agents and business workflows with controlled tool access, human approvals and execution visibility. Explore Nexus Core.",
    h1: "AI agents and workflow automation for business teams",
    body: "Nexus Core brings AI agent capabilities and business workflows into one platform, with controls for access, approvals and execution visibility."
  },
  {
    path: "/ai-agents",
    title: "AI Agents for Business | Nexus Core",
    description: "Explore AI agents for business operations, workflow coordination, task execution and controlled access to business tools.",
    h1: "AI agents for business operations",
    body: "Discover how AI agents can support business tasks, coordinate workflows and work within defined permissions and approval processes."
  },
  {
    path: "/workflow-automation",
    title: "Business Workflow Automation | Nexus Core",
    description: "Coordinate multi-step business workflows with AI agents, controlled tool access, human review and execution visibility.",
    h1: "Business workflow automation with AI",
    body: "Coordinate multi-step work with AI agents while maintaining visibility into permissions, approvals and execution."
  },
  {
    path: "/agents",
    title: "AI Agent Directory | Nexus Core",
    description: "Explore the Nexus Core agent directory, including available products, capabilities and agents under development.",
    h1: "Explore the Nexus Core agent directory",
    body: "Browse available AI products and agent capabilities. Product availability and maturity vary by listing."
  },
  {
    path: "/pricing",
    title: "Nexus Core Pricing and Plans",
    description: "Explore Nexus Core plans for AI agents and business workflow coordination. Contact the team for plan and availability details.",
    h1: "Nexus Core plans",
    body: "Explore platform plans and available options for AI agent-powered business workflows."
  },
  {
    path: "/architecture",
    title: "Nexus Core Platform Architecture",
    description: "Learn about the Nexus Core platform architecture, agent coordination, workflow execution and operational controls.",
    h1: "Nexus Core platform architecture",
    body: "Explore the platform concepts behind agent coordination, workflow execution, permissions and operational visibility."
  },
  {
    path: "/docs",
    title: "Nexus Core Documentation",
    description: "Find documentation and guidance for using Nexus Core, exploring AI agents and coordinating business workflows.",
    h1: "Nexus Core documentation",
    body: "Explore product guidance and information about Nexus Core capabilities."
  },
  {
    path: "/blog",
    title: "AI Agents and Automation Insights | Nexus Core Blog",
    description: "Read practical articles about AI agents, business workflow automation, customer support operations and technology.",
    h1: "AI and business automation insights",
    body: "Explore articles and practical guidance about AI agents, business workflows and customer support operations."
  },
  {
    path: "/supportops",
    title: "AI Customer Support Software | SupportOps by Nexus Core",
    description: "Organise customer conversations, triage support tickets and coordinate team workflows with SupportOps by Nexus Core.",
    h1: "AI-assisted customer support workflows",
    body: "SupportOps helps support teams organise incoming conversations, triage tickets and coordinate follow-up across configured channels."
  },
  {
    path: "/supportops/features",
    title: "SupportOps Features | Customer Support Workflows",
    description: "Explore SupportOps features for ticket triage, team coordination, support workflows and operational visibility.",
    h1: "SupportOps features",
    body: "Explore capabilities for ticket triage, team coordination, escalation workflows and operational visibility. Availability depends on configuration and plan."
  },
  {
    path: "/supportops/pricing",
    title: "SupportOps Pricing | Plans for Support Teams",
    description: "Compare SupportOps plans for AI-assisted customer support workflows. Check current plan details and availability.",
    h1: "SupportOps plans and pricing",
    body: "Review available SupportOps plans and features. Current prices and plan availability are confirmed through the pricing service."
  },
  {
    path: "/supportops/demo",
    title: "SupportOps Interactive Demo | Nexus Core",
    description: "Explore the SupportOps demo and see examples of support inbox organisation, ticket workflows and team coordination.",
    h1: "Explore the SupportOps demo",
    body: "Explore a demonstration of support inbox and ticket workflows. Demo data is illustrative and does not represent live customer records."
  },
  {
    path: "/contact",
    title: "Contact Nexus Core | Product and Sales Enquiries",
    description: "Contact Nexus Core about AI agents, business workflow automation and SupportOps customer support software.",
    h1: "Contact Nexus Core",
    body: "Contact the Nexus Core team about platform capabilities, product enquiries and business workflow requirements."
  },
  {
    path: "/careers",
    title: "Careers | Nexus Core",
    description: "Explore career opportunities and ways to work with Nexus Core.",
    h1: "Careers at Nexus Core",
    body: "Learn more about opportunities to work with Nexus Core."
  },
  {
    path: "/privacy-policy",
    title: "Privacy Policy | Nexus Core",
    description: "Read the Nexus Core privacy policy and information about data handling.",
    h1: "Nexus Core privacy policy",
    body: "Read the privacy policy for information about data handling and privacy."
  },
  {
    path: "/terms-of-service",
    title: "Terms of Service | Nexus Core",
    description: "Read the terms governing the use of Nexus Core services.",
    h1: "Nexus Core terms of service",
    body: "Review the terms and conditions applicable to Nexus Core services."
  },
  {
    path: "/tools",
    title: "Developer and Operations Tools | Nexus Core",
    description: "Explore tools from Nexus Core for developers and technology operations teams.",
    h1: "Developer and operations tools",
    body: "Explore available tools designed to support development and technology operations."
  },
  {
    path: "/tools/webhook-validator",
    title: "Webhook Validator | Nexus Core Tools",
    description: "Explore the Nexus Core webhook validator for inspecting and validating webhook requests.",
    h1: "Webhook validator",
    body: "Use the webhook validator to inspect webhook requests and support integration troubleshooting."
  },
  {
    path: "/tools/auditloganalyzer",
    title: "Audit Log Analyzer | Nexus Core Tools",
    description: "Explore the Nexus Core audit log analyzer for reviewing and investigating audit log data.",
    h1: "Audit log analyzer",
    body: "Review audit log data with the Nexus Core audit log analyzer."
  },
  {
    path: "/compliance/pricing",
    title: "Cross-Border Compliance Pricing | Nexus Core",
    description: "Explore plans for customs document auditing, duty calculations and cross-border compliance workflows.",
    h1: "Cross-Border Compliance plans",
    body: "Explore available plans for the Cross-Border Compliance product."
  }
];

const blogArticles = [
  {
    slug: "autonomous-ai-agent-swarms-enterprise-automation",
    title: "How AI Agents Coordinate Multi-Step Business Workflows",
    description: "Understand how AI agent orchestration, execution workers, retries and audit records support multi-step business workflow automation."
  },
  {
    slug: "ai-customer-support-automation-supportops",
    title: "Customer Support Ticket Management and Workflow Automation",
    description: "Learn how SupportOps helps teams organise support channels, manage tickets, assign conversations, monitor SLAs and coordinate customer support."
  }
];

for (const article of blogArticles) {
  routes.push({
    path: `/blog/${article.slug}`,
    title: `${article.title} | Nexus Core`,
    description: article.description,
    h1: article.title,
    body: article.description
  });
}

// Generate dedicated pages only for products marked live or beta.
// Roadmap and development listings should not be indexed as available products.
const registryDir = path.resolve("src/agents/registry");

for (const file of (await fs.readdir(registryDir)).filter((name) => name.endsWith(".agent.js")).sort()) {
  const agent = (await import(pathToFileURL(path.join(registryDir, file)).href)).default;

  if (!["live", "beta"].includes(String(agent.status).toLowerCase())) continue;

  routes.push({
    path: `/agents/${agent.slug}`,
    title: `${agent.name} | Nexus Core`,
    description: String(agent.summary || agent.name).slice(0, 155),
    h1: agent.name,
    body: String(agent.summary || agent.description || ""),
  });
}

const template = await fs.readFile(path.join(root, "index.html"), "utf8");

const esc = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const robots = `User-agent: *
Allow: /

Disallow: /dashboard
Disallow: /insights
Disallow: /integrations
Disallow: /executions
Disallow: /goals
Disallow: /admin
Disallow: /billing
Disallow: /login
Disallow: /register
Disallow: /forgot-password
Disallow: /reset-password

Disallow: /compliance/login
Disallow: /compliance/register
Disallow: /compliance/forgot-password
Disallow: /compliance/reset-password
Disallow: /compliance/billing

Disallow: /supportops/login
Disallow: /supportops/register
Disallow: /supportops/auth
Disallow: /supportops/agent
Disallow: /supportops/admin
Disallow: /supportops/management
Disallow: /supportops/investor

Sitemap: ${origin}/sitemap.xml
`;

await fs.writeFile(path.join(root, "app.html"), template.replace(
  /<meta name="robots"[^>]*>/,
  '<meta name="robots" content="noindex, follow" />'
));

for (const route of routes) {
  const canonical = `${origin}${route.path === "/" ? "/" : route.path}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: route.title,
    description: route.description,
    url: canonical,
    isPartOf: {
      "@type": "WebSite",
      name: "Nexus Core",
      url: `${origin}/`
    }
  };

  let html = template
    .replace(/<title>.*?<\/title>/s, "")
    .replace(/<meta name="description"[^>]*>/g, "")
    .replace(/<meta name="robots"[^>]*>/g, "")
    .replace(/<link rel="canonical"[^>]*>/g, "")
    .replace(/<meta property="og:url"[^>]*>/g, "")
    .replace(/<meta property="og:title"[^>]*>/g, "")
    .replace(/<meta property="og:description"[^>]*>/g, "")
    .replace(/<meta name="twitter:card"[^>]*>/g, "")
    .replace(/<meta name="twitter:title"[^>]*>/g, "")
    .replace(/<meta name="twitter:description"[^>]*>/g, "");

  const meta = [
    `<title>${esc(route.title)}</title>`,
    `<meta name="description" content="${esc(route.description)}" />`,
    '<meta name="robots" content="index, follow, max-image-preview:large" />',
    `<link rel="canonical" href="${canonical}" />`,
    '<meta property="og:type" content="website" />',
    `<meta property="og:url" content="${canonical}" />`,
    `<meta property="og:title" content="${esc(route.title)}" />`,
    `<meta property="og:description" content="${esc(route.description)}" />`,
    '<meta property="og:image" content="https://nexusthecore.com/og-image.png" />',
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${esc(route.title)}" />`,
    `<meta name="twitter:description" content="${esc(route.description)}" />`,
    '<meta name="twitter:image" content="https://nexusthecore.com/og-image.png" />',
    `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`
  ].join("\n");

  html = html.replace("</head>", `${meta}\n</head>`);

  const fallback = `<noscript><main><h1>${esc(route.h1)}</h1><p>${esc(route.body)}</p></main></noscript>`;
  html = html.replace('<div id="root"></div>', `${fallback}<div id="root"></div>`);

  const output = path.join(root, route.path === "/" ? "" : route.path.slice(1), "index.html");
  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.writeFile(output, html);
}

const sitemap = routes.map(({ path: routePath }) => {
  const loc = `${origin}${routePath === "/" ? "/" : routePath}`;
  return `  <url><loc>${loc}</loc></url>`;
}).join("\n");

await fs.writeFile(
  path.join(root, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemap}\n</urlset>\n`
);

await fs.writeFile(path.join(root, "robots.txt"), robots);

console.log(`Generated ${routes.length} indexable route pages, sitemap.xml and robots.txt.`);
