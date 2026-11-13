import { defineAgent } from "../defineAgent.js";

export default defineAgent({
  slug: "cross-border-compliance",
  name: "Cross-Border Compliance System",
  category: "security",
  status: "live",
  icon: "ShieldCheck",
  accent: "emerald",
  product: "compliance",
  order: 1,
  summary: "Customs document audit, duty and tax calculation, M-Pesa duty payment and ICMS export for clearing & forwarding agents.",
  description:
    "Upload a commercial invoice and packing list. The agent checks HS codes and declared values, flags discrepancies, calculates import duty, VAT, IDF and RDL, then lets you pay the assessment by M-Pesa and export the declaration. It runs in its own Compliance workspace with a separate sign-in.",
  capabilities: ["Statutory Screening", "Duty Calculation", "M-Pesa Payment", "ICMS Export"],
  metrics: { latency: "14ms", throughput: "12.4k/s", accuracy: "99.9%" },
  launch: { to: "/compliance", label: "Open Compliance workspace" },
});
