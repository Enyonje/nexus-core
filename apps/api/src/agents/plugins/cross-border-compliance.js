import { defineAgent } from "../defineAgent.js";

// Duty estimate used by the compliance workspace. Rates are illustrative defaults for Kenya (EAC CET);
// the full engine lives in apps/api/compliance-api.
const RATES = { importDuty: 0.25, exciseDuty: 0, vat: 0.16, idf: 0.025, rdl: 0.02 };

export default defineAgent({
  slug: "cross-border-compliance",
  name: "Cross-Border Compliance",
  agentType: "WORKER",
  product: "compliance",
  capabilities: { customs: true, dutyCalculation: true, documentAudit: true },
  async run({ input }) {
    const cifUsd = Number(input.cifValueUsd);
    const fx = Number(input.exchangeRate || 129);
    if (!Number.isFinite(cifUsd) || cifUsd <= 0) return { error: "cifValueUsd must be a positive number" };
    const cif = cifUsd * fx;
    const importDuty = cif * RATES.importDuty;
    const vat = (cif + importDuty) * RATES.vat;
    const idf = cif * RATES.idf;
    const rdl = cif * RATES.rdl;
    const round = (n) => Math.round(n);
    return {
      cifValueKes: round(cif),
      taxBreakdown: { importDuty: round(importDuty), vat: round(vat), idf: round(idf), rdl: round(rdl), totalKes: round(importDuty + vat + idf + rdl) },
    };
  },
});
