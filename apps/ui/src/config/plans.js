// Offline copy of the plan catalog in apps/api/src/billing/catalog.js, shown only if the
// pricing service cannot be reached. Checkout always uses the live list from the API.
const p = (m, a) => ({ monthly: { amount: m }, annual: { amount: a } });
export const FALLBACK_PLANS = {
  "nexus-core": [
    { key: "free", name: "Free", description: "Explore agents and run small workflows.", prices: p(0, 0), features: ["5 goals", "3 executions per day", "Community support"] },
    { key: "starter", name: "Starter", description: "For individual builders and small workflows.", prices: p(29, 23), features: ["Up to 5 active agents", "10,000 execution credits / month", "Standard support", "Basic analytics"] },
    { key: "pro", name: "Pro", popular: true, description: "For teams running multi-agent workflows.", prices: p(79, 63), features: ["Unlimited active agents", "100,000 execution credits / month", "Live execution stream", "Advanced audit logs", "Priority support"] },
    { key: "enterprise", name: "Enterprise", description: "Custom infrastructure, SSO and an SLA.", prices: p(249, 199), features: ["Custom execution credits", "Dedicated database", "Custom agent integrations", "SLA & priority support", "Role-based access management"] },
  ],
  compliance: [
    { key: "free", name: "Sandbox", description: "Audit sample declarations.", prices: p(0, 0), features: ["5 declarations / month", "PDF assessment export"] },
    { key: "pro", name: "Broker", popular: true, description: "For clearing & forwarding agents.", prices: p(59, 47), features: ["250 declarations / month", "Duty & tax calculation", "M-Pesa duty payment", "ICMS XML export"] },
    { key: "enterprise", name: "Enterprise", description: "High-volume brokers and importers.", prices: p(299, 239), features: ["Unlimited declarations", "Team roles", "API access", "Priority support"] },
  ],
};
