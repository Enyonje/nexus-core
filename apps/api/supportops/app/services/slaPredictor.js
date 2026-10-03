export function predictSLARisk({
  ticketAgeMinutes,
  priority,
  avgResolutionMinutes,
  backlogSize,
  aiConfidence
}) {
  let risk = 0;

  // Age vs historical resolution
  if (ticketAgeMinutes > avgResolutionMinutes * 0.6) risk += 30;
  if (ticketAgeMinutes > avgResolutionMinutes * 0.8) risk += 20;

  // Priority weight
  if (priority === "Urgent") risk += 25;
  if (priority === "High") risk += 15;

  // Backlog pressure
  if (backlogSize > 50) risk += 15;
  if (backlogSize > 100) risk += 25;

  // AI uncertainty
  if (aiConfidence < 0.75) risk += 10;

  const status =
    risk >= 70
      ? "BREACH_IMMINENT"
      : risk >= 40
      ? "AT_RISK"
      : "SAFE";

  return {
    slaRiskScore: Math.min(risk, 100),
    slaStatus: status
  };
}
