import { getTariffData, TariffData } from "../providers/tradeTariffProvider";
import { checkZonosCompliance, ZonosComplianceResult } from "../providers/zonosProvider";
import { checkLocalRules } from "../providers/localRulesProvider";

interface HSCode {
  hs_code: string;
}

export interface ComplianceData {
  jobId: string;
  hsCodes: HSCode[];
  items: Array<{ name: string; category: string; value?: number }>;
  destination: string;
  origin: string;
  [key: string]: any; // allow additional fields like invoiceData, buyer, seller, etc.
}

export interface ComplianceResult {
  valid: boolean;
  issues: string[];
  checkedAt: string;
}

export async function runCompliance(data: ComplianceData): Promise<ComplianceResult> {
  const issues: string[] = [];
  let valid = true;

  // 1. Global Tariff Validation
  for (const item of data.hsCodes) {
    const tariff: TariffData | null = await getTariffData(item.hs_code);

    if (!tariff) {
      valid = false;
      issues.push(`Invalid HS Code: ${item.hs_code}`);
    }
  }

  // 2. Commercial API (if enabled)
  if (process.env.USE_ZONOS === "true") {
    const zonos: ZonosComplianceResult = await checkZonosCompliance(data);

    if (!zonos.valid) {
      valid = false;
      issues.push(...zonos.issues);
    }
  }

  // 3. Local African Rules
  const local = checkLocalRules(data);

  if (!local.valid) {
    valid = false;
    issues.push(...local.issues);
  }

  return {
    valid,
    issues,
    checkedAt: new Date().toISOString(),
  };
}
