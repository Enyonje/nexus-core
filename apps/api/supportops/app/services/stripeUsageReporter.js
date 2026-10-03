import stripe from "../lib/stripe.js";
import Usage from "../models/Usage.js";
import Tenant from "../models/Tenant.js";

export async function reportUsageToStripe() {
  const unreported = await Usage.find({ reported: false }).populate("tenantId");

  for (const usage of unreported) {
    const tenant = usage.tenantId;
    if (!tenant?.stripeSubscriptionItemId) continue;

    await stripe.subscriptionItems.createUsageRecord(
      tenant.stripeSubscriptionItemId,
      {
        quantity: usage.quantity,
        timestamp: Math.floor(Date.now() / 1000)
      }
    );

    usage.reported = true;
    await usage.save();
  }
}
