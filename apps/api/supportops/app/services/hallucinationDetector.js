export function analyzeAIResponse({
  aiResponse,
  confidenceScore,
  citedSources = [],
}) {
  let flags = [];
  let riskScore = 0;

  // Low confidence
  if (confidenceScore < 0.75) {
    flags.push("LOW_CONFIDENCE");
    riskScore += 30;
  }

  // Overconfident language
  const overconfidentPhrases = [
    "definitely",
    "guaranteed",
    "100%",
    "always",
    "never"
  ];

  if (
    overconfidentPhrases.some(p =>
      aiResponse.toLowerCase().includes(p)
    )
  ) {
    flags.push("OVER_ASSERTIVE_LANGUAGE");
    riskScore += 20;
  }

  // No sources
  if (citedSources.length === 0) {
    flags.push("NO_SOURCES");
    riskScore += 25;
  }

  // Short vague responses
  if (aiResponse.length < 80) {
    flags.push("INSUFFICIENT_DETAIL");
    riskScore += 15;
  }

  return {
    riskScore,
    flags,
    isHallucinationRisk: riskScore >= 40
  };
}
