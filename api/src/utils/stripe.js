import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

/**
 * Map app subscription tiers to Stripe Price IDs.
 */
export function getStripePriceId(tier) {
  switch (tier) {
    case "pro":
      return process.env.STRIPE_PRICE_PRO;
    case "enterprise":
      return process.env.STRIPE_PRICE_ENTERPRISE;
    default:
      throw new Error(`Unknown subscription tier: ${tier}`);
  }
}

/**
 * Create a Stripe customer for a new user.
 * @param {object} user - { id, email, name }
 * @returns {Promise<string>} Stripe customer ID
 */
export async function createStripeCustomer(user) {
  const customer = await stripe.customers.create({
    email: user.email,
    name: user.name,
    metadata: { userId: user.id },
  });
  return customer.id;
}

/**
 * Fetch the latest subscription status for a given customer.
 */
export async function getSubscriptionStatus(customerId) {
  try {
    const subs = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 1,
    });

    if (!subs.data.length) {
      return { tier: "free", active: false };
    }

    const sub = subs.data[0];
    const active = sub.status === "active" || sub.status === "trialing";

    const priceId = sub.items.data[0].price.id;
    let tier = "free";
    if (priceId === process.env.STRIPE_PRICE_PRO) tier = "pro";
    if (priceId === process.env.STRIPE_PRICE_ENTERPRISE) tier = "enterprise";

    return { tier, active };
  } catch (err) {
    console.error("Stripe subscription lookup failed:", err.message);
    return { tier: "free", active: false };
  }
}