// Plan catalog for every product. This is the single source of truth for what each plan costs and
// includes on the server; the website's pricing pages read it from GET /api/<product>/billing/plans.
//
// Stripe price IDs come from the environment so test and live mode can differ:
//   STRIPE_PRICE_<PRODUCT>_<PLAN>_<MONTHLY|ANNUAL>   e.g. STRIPE_PRICE_NEXUS_CORE_PRO_MONTHLY=price_123
// A paid plan without a configured price ID is shown on the pricing page but cannot be checked out.
//
// `amount` is the per-month price in USD for that interval (annual is billed as amount x 12).
// `rank` orders plans for entitlement checks: higher rank includes everything below it.

const p = (monthly, annual) => ({ monthly: { amount: monthly }, annual: { amount: annual } });

export const CATALOG = Object.freeze({
  "nexus-core": [
    { key: "free", name: "Free", rank: 0, description: "Explore agents and run small workflows.", prices: p(0, 0),
      features: ["5 goals", "3 executions per day", "Community support"], limits: { goals: 5, executionsPerDay: 3 } },
    { key: "starter", name: "Starter", rank: 1, description: "For individual builders and small workflows.", prices: p(29, 23),
      features: ["Up to 5 active agents", "10,000 execution credits / month", "Standard support", "Basic analytics"], limits: { goals: 25, executionsPerDay: 20 } },
    { key: "pro", name: "Pro", rank: 2, popular: true, description: "For teams running multi-agent workflows.", prices: p(79, 63),
      features: ["Unlimited active agents", "100,000 execution credits / month", "Live execution stream", "Advanced audit logs", "Priority support"], limits: { goals: 50, executionsPerDay: 50 } },
    { key: "enterprise", name: "Enterprise", rank: 3, description: "Custom infrastructure, SSO and an SLA.", prices: p(249, 199),
      features: ["Custom execution credits", "Dedicated database", "Custom agent integrations", "SLA & priority support", "Role-based access management"], limits: { goals: null, executionsPerDay: null } },
  ],
  supportops: [
    { key: "free", name: "Free", rank: 0, description: "Try the inbox with sample tickets.", prices: p(0, 0),
      features: ["1 seat", "Demo inbox"], limits: { seats: 1, aiResolutions: 25 } },
    { key: "starter", name: "Starter", rank: 1, description: "AI triage for small support teams.", prices: p(49, 39),
      features: ["3 seats", "1,000 AI resolutions / month", "Email & chat channels"], limits: { seats: 3, aiResolutions: 1000 } },
    { key: "growth", name: "Growth", rank: 2, popular: true, description: "Automation and analytics for growing teams.", prices: p(149, 119),
      features: ["10 seats", "10,000 AI resolutions / month", "WhatsApp channel", "SLA risk alerts", "Revenue impact analytics"], limits: { seats: 10, aiResolutions: 10000 } },
    { key: "enterprise", name: "Enterprise", rank: 3, description: "Unlimited seats, custom playbooks, SLA.", prices: p(499, 399),
      features: ["Unlimited seats", "Custom playbooks", "Dedicated success manager", "SLA"], limits: { seats: null, aiResolutions: null } },
  ],
  compliance: [
    { key: "free", name: "Sandbox", rank: 0, description: "Audit sample declarations.", prices: p(0, 0),
      features: ["5 declarations / month", "PDF assessment export"], limits: { declarations: 5 } },
    { key: "pro", name: "Broker", rank: 1, popular: true, description: "For clearing & forwarding agents.", prices: p(59, 47),
      features: ["250 declarations / month", "Duty & tax calculation", "M-Pesa duty payment", "ICMS XML export"], limits: { declarations: 250 } },
    { key: "enterprise", name: "Enterprise", rank: 2, description: "High-volume brokers and importers.", prices: p(299, 239),
      features: ["Unlimited declarations", "Team roles", "API access", "Priority support"], limits: { declarations: null } },
  ],
});

export const INTERVALS = ["monthly", "annual"];

export function plansFor(product) {
  const plans = CATALOG[product];
  if (!plans) throw new Error(`No plans for product "${product}"`);
  return plans;
}

export function planByKey(product, key) {
  return (CATALOG[product] || []).find((plan) => plan.key === key) || null;
}

export function planRank(product, key) {
  return planByKey(product, key)?.rank ?? 0;
}

const envKey = (product, plan, interval) =>
  `STRIPE_PRICE_${product}_${plan}_${interval}`.toUpperCase().replace(/[^A-Z0-9]/g, "_");

export function stripePriceId(product, planKey, interval, env = process.env) {
  return env[envKey(product, planKey, interval)] || null;
}

/** Reverse lookup used by the webhook when Stripe tells us which price a subscription is on. */
export function planForPriceId(priceId, env = process.env) {
  if (!priceId) return null;
  for (const [product, plans] of Object.entries(CATALOG)) {
    for (const plan of plans) {
      for (const interval of INTERVALS) {
        if (stripePriceId(product, plan.key, interval, env) === priceId) return { product, planKey: plan.key, interval };
      }
    }
  }
  return null;
}

/** Public, display-safe view of the catalog. */
export function publicPlans(product, env = process.env) {
  return plansFor(product).map((plan) => ({
    key: plan.key,
    name: plan.name,
    description: plan.description,
    popular: Boolean(plan.popular),
    features: plan.features,
    limits: plan.limits,
    prices: Object.fromEntries(
      INTERVALS.map((interval) => {
        const amount = plan.prices[interval].amount;
        return [interval, {
          amount,
          display: amount === 0 ? "$0" : `$${amount}`,
          billedAs: interval === "annual" && amount > 0 ? `$${amount * 12} billed yearly` : amount > 0 ? "billed monthly" : "free forever",
          checkout: amount === 0 ? "none" : stripePriceId(product, plan.key, interval, env) ? "stripe" : "contact",
        }];
      })
    ),
  }));
}

export { envKey as stripePriceEnvKey };
