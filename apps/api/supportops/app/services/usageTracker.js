import Usage from "../models/Usage.js";

export async function trackUsage(tenantId, metric, quantity = 1) {
  await Usage.create({
    tenantId,
    metric,
    quantity
  });
}
