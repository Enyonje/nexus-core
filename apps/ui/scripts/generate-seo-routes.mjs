import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = path.resolve('dist');
const origin = 'https://nexusthecore.com';
const routes = [
  { path: '/', title: 'AI Agents & Workflow Automation Platform | Nexus Core', description: 'Nexus Core helps teams coordinate AI agents across business workflows with approved tool access, human approval gates, spending limits and auditable execution.', h1: 'AI agents and workflow automation with human oversight', body: 'Nexus Core helps teams coordinate AI agents across business workflows. Connect approved tools, define review gates and keep visibility into agent execution.', links: [['Explore AI agents', '/ai-agents'], ['Workflow automation', '/workflow-automation'], ['Explore SupportOps', '/supportops']] },
  { path: '/ai-agents', title: 'AI Agents for Business Workflows | Nexus Core', description: 'Explore Nexus Core AI agents for business workflows, with tool access, approval gates, spending limits and auditable execution.', h1: 'AI agents built to help teams get real work done', body: 'Coordinate agent-led work with approved tool access, human approval gates, spending limits and execution history.', links: [['Browse AI agents', '/agents'], ['Contact the team', '/contact']] },
  { path: '/workflow-automation', title: 'AI Workflow Automation Software | Nexus Core', description: 'Coordinate business workflows with AI agents, approved tool access, human review gates and execution visibility from Nexus Core.', h1: 'Automate workflows without losing oversight', body: 'Nexus Core helps teams coordinate multi-step work with AI agents while retaining control over permissions, approvals, budgets and execution history.', links: [['Explore the platform', '/agents'], ['Contact the team', '/contact']] },
  { path: '/agents', title: 'AI Agents Directory | Nexus Core', description: 'Explore AI agents and capabilities available in the Nexus Core platform.', h1: 'Explore AI agents', body: 'Discover agent capabilities and how they can support business workflows with appropriate permissions and oversight.', links: [['View pricing', '/pricing'], ['Contact the team', '/contact']] },
  { path: '/pricing', title: 'Nexus Core Pricing | AI Agent Platform', description: 'Review Nexus Core platform plans and options for AI agent-powered business workflows.', h1: 'Nexus Core pricing', body: 'Review platform options and contact the team for details about plans and availability.', links: [['Contact sales', '/contact'], ['Explore AI agents', '/ai-agents']] },
  { path: '/supportops', title: 'AI Customer Support Automation | SupportOps by Nexus Core', description: 'Explore SupportOps AI for customer support workflows, ticket triage, team coordination and operational visibility.', h1: 'AI-assisted customer support workflows', body: 'SupportOps helps support teams organise incoming conversations, triage tickets and coordinate team follow-up across configured channels.', links: [['Explore the demo', '/supportops/demo'], ['Compare plans', '/supportops/pricing'], ['View features', '/supportops/features']] },
  { path: '/supportops/features', title: 'SupportOps Features | AI Customer Support Workflows', description: 'Discover SupportOps capabilities for ticket triage, support-team workflows, operational visibility and escalation management.', h1: 'SupportOps features for customer support teams', body: 'Explore ticket triage, team workflows, operational visibility and escalation support. Availability depends on your configured integrations and plan.', links: [['Explore the demo', '/supportops/demo'], ['Compare plans', '/supportops/pricing']] },
  { path: '/supportops/pricing', title: 'SupportOps Pricing | AI Customer Support Software', description: 'Compare SupportOps plans for AI-assisted customer support workflows. Confirm current plan prices and availability before checkout.', h1: 'SupportOps plans and pricing', body: 'Compare the available SupportOps plans and features. Live prices are confirmed by the pricing service; estimated fallback prices are not valid checkout prices.', links: [['Explore the interactive demo', '/supportops/demo'], ['Contact the team', '/contact'], ['SupportOps overview', '/supportops']] },
  { path: '/supportops/demo', title: 'Explore the SupportOps Demo | Nexus Core', description: 'Explore an interactive SupportOps preview with fictional sample tickets, inbox views and support workflow examples.', h1: 'Explore the SupportOps interactive demo', body: 'Try the read-only preview using fictional sample conversations. The demo does not connect to live customer systems or process real tickets.', links: [['Compare plans', '/supportops/pricing'], ['SupportOps overview', '/supportops']] },
  { path: '/supportops/whatsapp-automation', title: 'WhatsApp Customer Support Automation | SupportOps AI', description: 'Explore SupportOps for customer-support workflows across connected channels, including WhatsApp where configured.', h1: 'Bring WhatsApp conversations into an organised support workflow', body: 'SupportOps is designed to help teams organise incoming conversations and triage tickets. WhatsApp availability depends on a configured channel connection.', links: [['Explore the demo', '/supportops/demo'], ['Compare plans', '/supportops/pricing']] },
  { path: '/contact', title: 'Contact Nexus Core | Product & Sales Enquiries', description: 'Contact the Nexus Core team about AI agents, workflow automation and SupportOps customer support workflows.', h1: 'Contact Nexus Core', body: 'Get in touch with the team about AI agents, workflow automation and SupportOps.', links: [['Explore SupportOps', '/supportops'], ['Explore AI agents', '/ai-agents']] },
];

// One generated page per agent manifest in src/agents/registry (plain data files, safe to import here).
const registryDir = path.resolve('src/agents/registry');
for (const file of (await fs.readdir(registryDir)).filter((f) => f.endsWith('.agent.js')).sort()) {
  const agent = (await import(pathToFileURL(path.join(registryDir, file)).href)).default;
  routes.push({
    path: `/agents/${agent.slug}`,
    title: `${agent.name} | Nexus Core Agents`.slice(0, 60),
    description: agent.summary.slice(0, 155),
    h1: agent.name,
    body: agent.description || agent.summary,
    links: [['All agents', '/agents'], ['Pricing', '/pricing']],
  });
}
routes.push(
  { path: '/compliance/pricing', title: 'Cross-Border Compliance Pricing | Nexus Core', description: 'Plans for clearing and forwarding agents: customs audit, duty calculation, M-Pesa duty payment and ICMS export.', h1: 'Cross-Border Compliance pricing', body: 'Compare Sandbox, Broker and Enterprise plans for customs compliance.', links: [['Compliance agent', '/agents/cross-border-compliance'], ['Contact the team', '/contact']] },
);

const template = await fs.readFile(path.join(root, 'index.html'), 'utf8');
// Untouched copy of the app shell for every URL that has no generated page (sign-in, dashboard, 404 ...).
// vercel.json rewrites unknown paths to /app.html. Before, those URLs got the homepage's HTML,
// title and canonical, so Google saw /login, /dashboard etc. as duplicates of the homepage.
await fs.writeFile(path.join(root, 'app.html'), template.replace('<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />', '<meta name="robots" content="noindex, follow" />'));
const esc = (s) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

for (const route of routes) {
  const canonical = `${origin}${route.path === '/' ? '/' : route.path}`;
  // Wrap the injected SEO block with Tailwind's sr-only (screen-reader only) class
  // This keeps it hidden from the visual viewport while remaining 100% readable to Googlebot.
  const content = `<main id="seo-content" class="sr-only"><h1>${esc(route.h1)}</h1><p>${esc(route.body)}</p><nav aria-label="Related pages">${route.links.map(([label, href]) => `<a href="${href}">${esc(label)}</a>`).join(' · ')}</nav></main>`;

  // 1. Clean out existing titles or description/robots tags if they exist to prevent duplicates
  let html = template
    .replace(/<title>.*?<\/title>/s, '')
    .replace(/<meta name="description"[^>]*>/g, '')
    .replace(/<meta name="robots"[^>]*>/g, '');

  // 2. Build a single, fully structured block of metadata
  const metaBlock = [
    `<title>${esc(route.title)}</title>`,
    `<meta name="description" content="${esc(route.description)}" />`,
    `<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />`,
    `<link rel="canonical" href="${canonical}" />`,
    `<meta property="og:url" content="${canonical}" />`,
    `<meta property="og:title" content="${esc(route.title)}" />`,
    `<meta property="og:description" content="${esc(route.description)}" />`,
    `</head>`
  ].join('\n');

  // 3. Inject cleanly into the head
  html = html.replace('</head>', metaBlock);

  // 4. Injected markup remains clean before React hydration target
  html = html.replace('<div id="root"></div>', `${content}<div id="root"></div>`);

  const out = path.join(root, route.path === '/' ? '' : route.path.slice(1), 'index.html');
  await fs.mkdir(path.dirname(out), { recursive: true });
  await fs.writeFile(out, html);
}
console.log(`Generated route-specific SEO HTML for ${routes.length} public routes.`);

// Keep the public sitemap aligned with the exact set of generated, indexable routes.
const sitemapEntries = routes.map((route) => {
  const loc = `${origin}${route.path === '/' ? '/' : route.path}`;
  return `  <url><loc>${loc}</loc><changefreq>${route.path === '/' ? 'weekly' : 'monthly'}</changefreq></url>`;
}).join('\n');
await fs.writeFile(path.join(root, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapEntries}\n</urlset>\n`);

const robots = `User-agent: *\nAllow: /\nDisallow: /dashboard\nDisallow: /executions\nDisallow: /goals\nDisallow: /admin\nDisallow: /billing\nDisallow: /compliance/login\nDisallow: /compliance/register\nDisallow: /compliance/billing\nDisallow: /supportops/login\nDisallow: /supportops/agent\nDisallow: /supportops/admin\nDisallow: /supportops/management\nDisallow: /supportops/investor\n\nSitemap: ${origin}/sitemap.xml\n`;
await fs.writeFile(path.join(root, 'robots.txt'), robots);
console.log(`Wrote sitemap.xml with ${routes.length} canonical public routes and robots.txt.`);
