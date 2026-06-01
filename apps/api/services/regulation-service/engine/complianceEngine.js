// regulation-service/engine/complianceEngine.js
const { getTariffData } = require('../providers/tradeTariffProvider');
const { checkZonosCompliance } = require('../providers/zonosProvider');
const { checkLocalRules } = require('../providers/localRulesProvider');

async function runCompliance(data) {
  let issues = [];
  let valid = true;

  // 1. Global Tariff Validation
  for (const item of data.hsCodes) {
    const tariff = await getTariffData(item.hs_code);

    if (!tariff) {
      valid = false;
      issues.push(`Invalid HS Code: ${item.hs_code}`);
    }
  }

  // 2. Commercial API (if enabled)
  if (process.env.USE_ZONOS === 'true') {
    const zonos = await checkZonosCompliance(data);

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
    checkedAt: new Date().toISOString()
  };
}

module.exports = { runCompliance };