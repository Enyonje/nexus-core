// regulation-service/providers/localRulesProvider.js

const rules = {
  KE: {
    restricted: ['weapons', 'chemicals'],
    maxValue: 1000000
  },
  NG: {
    restricted: ['pharmaceuticals'],
    requiresSpecialPermit: true
  }
};

function checkLocalRules(data) {
  const countryRules = rules[data.destination];

  let issues = [];

  data.items.forEach(item => {
    if (countryRules.restricted.includes(item.category)) {
      issues.push(`Restricted item: ${item.name}`);
    }
  });

  return {
    valid: issues.length === 0,
    issues
  };
}

module.exports = { checkLocalRules };