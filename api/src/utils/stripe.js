import Stripe from "stripe";

// Use a more recent API version for better compatibility with modern Stripe features
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16", 
});

/**
 * Map tier names to Stripe Price IDs from environment variables.
 * Added .toLowerCase() to prevent 'undefined' errors from case mismatches.
 */
export function getStripePriceId(tier) {
  if (!tier) return undefined;

  const prices = {
    pro: process.env.STRIPE_PRO_PRICE_ID,
    enterprise: process.env.STRIPE_ENTERPRISE_PRICE_ID,
    // Add 'ultra' if your dashboard uses that name
    ultra: process.env.STRIPE_ULTRA_PRICE_ID, 
  };

  const normalizedTier = tier.toLowerCase().trim();
  const priceId = prices[normalizedTier];

  if (!priceId) {
    console.error(`[Stripe Utils] No Price ID found for tier: "${tier}"`);
  }

  return priceId;
}

/**
 * Create a Stripe customer for a new user.
 */
export async function createStripeCustomer(user) {
  try {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name || user.email.split('@')[0],
      metadata: { userId: user.id },
    });
    return customer.id;
  } catch (err) {
    console.error("Stripe customer creation failed:", err.message);
    throw err;
  }
}

/**
 * Fetch the latest subscription status for a given customer.
 */
export async function getSubscriptionStatus(customerId) {
  if (!customerId) return { tier: "free", active: false };

  try {
    const subs = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 1,
      expand: ["data.items.data.price"], // Expand price data for cleaner access
    });

    if (!subs.data.length) {
      return { tier: "free", active: false };
    }

    const sub = subs.data[0];
    const active = ["active", "trialing"].includes(sub.status);

    const priceId = sub.items.data[0].price.id;
    
    // Reverse lookup: Match priceId back to a human-readable tier
    let tier = "free";
    if (priceId === process.env.STRIPE_PRO_PRICE_ID) tier = "pro";
    else if (priceId === process.env.STRIPE_ENTERPRISE_PRICE_ID) tier = "enterprise";
    else if (priceId === process.env.STRIPE_ULTRA_PRICE_ID) tier = "ultra";

    return { 
      tier, 
      active, 
      status: sub.status,
      cancelAtPeriodEnd: sub.cancel_at_period_end 
    };
  } catch (err) {
    console.error("Stripe subscription lookup failed:", err.message);
    return { tier: "free", active: false };
  }
}