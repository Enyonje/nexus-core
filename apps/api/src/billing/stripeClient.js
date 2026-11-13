let cached;

/** Returns a Stripe client, or null when STRIPE_SECRET_KEY is not configured (billing then answers 503). */
export async function getStripe(env = process.env) {
  if (!env.STRIPE_SECRET_KEY) return null;
  if (cached) return cached;
  const { default: Stripe } = await import("stripe");
  cached = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });
  return cached;
}
