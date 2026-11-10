import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const ORIGIN = "https://nexusthecore.com";
const metadata = {
  "/": { title: "AI Agents & Workflow Automation Platform | Nexus Core", description: "Nexus Core helps teams coordinate AI agents across business workflows with approved tool access, human approval gates, spending limits and auditable execution." },
  "/ai-agents": { title: "AI Agents for Business Workflows | Nexus Core", description: "Explore Nexus Core AI agents for business workflows, with tool access, approval gates, spending limits and auditable execution." },
  "/workflow-automation": { title: "AI Workflow Automation Software | Nexus Core", description: "Coordinate business workflows with AI agents, approved tool access, human review gates and execution visibility from Nexus Core." },
  "/agents": { title: "AI Agents Directory | Nexus Core", description: "Explore AI agents and capabilities available in the Nexus Core platform." },
  "/pricing": { title: "Nexus Core Pricing | AI Agent Platform", description: "Review Nexus Core platform plans and options for AI agent-powered business workflows." },
  "/supportops": { title: "AI Customer Support Automation | SupportOps by Nexus Core", description: "Explore SupportOps AI for customer support workflows, ticket triage, team coordination and operational visibility." },
  "/supportops/features": { title: "SupportOps Features | AI Customer Support Workflows", description: "Discover SupportOps capabilities for ticket triage, support-team workflows, operational visibility and escalation management." },
  "/supportops/pricing": { title: "SupportOps Pricing | AI Customer Support Software", description: "Compare SupportOps plans for AI-assisted customer support workflows. Confirm current plan prices and availability before checkout." },
  "/supportops/demo": { title: "Explore the SupportOps Demo | Nexus Core", description: "Explore an interactive SupportOps preview with fictional sample tickets, inbox views and support workflow examples." },
  "/supportops/whatsapp-automation": { title: "WhatsApp Customer Support Automation | SupportOps AI", description: "Explore SupportOps for customer-support workflows across connected channels, including WhatsApp where configured." },
  "/contact": { title: "Contact Nexus Core | Product & Sales Enquiries", description: "Contact the Nexus Core team about AI agents, workflow automation and SupportOps customer support workflows." },
};
const noIndex = [/^\/(dashboard|goals|executions|admin|subscription|login|register|forgot-password|reset-password)(\/|$)/, /^\/supportops\/(login|register|auth|cancel|success|admin|agent|investor|management)(\/|$)/];

function upsertMeta(attribute, key, content) {
  let node = document.head.querySelector(`meta[${attribute}="${key}"]`);
  if (!node) { node = document.createElement("meta"); node.setAttribute(attribute, key); document.head.appendChild(node); }
  node.setAttribute("content", content);
}

export default function SeoManager() {
  const { pathname } = useLocation();
  useEffect(() => {
    const page = metadata[pathname];
    if (!page) {
      upsertMeta("name", "robots", noIndex.some((rule) => rule.test(pathname)) ? "noindex, nofollow" : "index, follow, max-image-preview:large");
      return;
    }
    const canonical = `${ORIGIN}${pathname === "/" ? "/" : pathname}`;
    document.title = page.title;
    upsertMeta("name", "description", page.description);
    upsertMeta("name", "robots", "index, follow, max-image-preview:large, max-snippet:-1");
    upsertMeta("property", "og:type", "website");
    upsertMeta("property", "og:site_name", "Nexus Core");
    upsertMeta("property", "og:title", page.title);
    upsertMeta("property", "og:description", page.description);
    upsertMeta("property", "og:url", canonical);
    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:title", page.title);
    upsertMeta("name", "twitter:description", page.description);
    let link = document.head.querySelector('link[rel="canonical"]');
    if (!link) { link = document.createElement("link"); link.rel = "canonical"; document.head.appendChild(link); }
    link.href = canonical;
  }, [pathname]);
  return null;
}
