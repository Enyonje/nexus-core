interface Item {
  name: string;
  category: string;
  value?: number;
}

interface ComplianceData {
  destination: keyof typeof rules;
  items: Item[];
}

interface ComplianceResult {
  valid: boolean;
  issues: string[];
}

const rules: Record<
  string,
  {
    restricted: string[];
    maxValue?: number;
    requiresSpecialPermit?: boolean;
  }
> = {
  KE: {
    restricted: ["weapons", "chemicals"],
    maxValue: 1000000,
  },
  NG: {
    restricted: ["pharmaceuticals"],
    requiresSpecialPermit: true,
  },
};

export function checkLocalRules(data: ComplianceData): ComplianceResult {
  const countryRules = rules[data.destination];
  const issues: string[] = [];

  data.items.forEach((item) => {
    if (countryRules.restricted.includes(item.category)) {
      issues.push(`Restricted item: ${item.name}`);
    }
    if (countryRules.maxValue && item.value && item.value > countryRules.maxValue) {
      issues.push(`Item ${item.name} exceeds max value limit`);
    }
    if (countryRules.requiresSpecialPermit && item.category === "pharmaceuticals") {
      issues.push(`Item ${item.name} requires special permit`);
    }
  });

  return {
    valid: issues.length === 0,
    issues,
  };
}
