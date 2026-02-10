import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2022-11-15",
});

/**
 * Map tier names to Stripe Price IDs from environment variables.
 * @param {string} tier - e.g. "pro" or "enterprise"
 * @returns {string|undefined} Stripe Price ID
 */
export function getStripePriceId(tier) {
  const prices = {
    pro: process.env.STRIPE_PRO_PRICE_ID,
    enterprise: process.env.STRIPE_ENTERPRISE_PRICE_ID,
  };

  return prices[tier];
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