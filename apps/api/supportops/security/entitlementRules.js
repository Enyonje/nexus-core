// apps/api/supportops/security/entitlementRules.js
// Pure pricing rules (no database), unit tested.

export const effectiveFeatures = (plan, addons = []) =>
    [...new Set([...(plan?.features ?? []), ...addons.flatMap((a) => a.features ?? [])])];

// A trial override (e.g. 100 AI resolutions) beats the plan limit. null = unlimited.
export function effectiveLimit(plan, sub, metric) {
    const override = sub?.limit_overrides?.[metric];
    if (override !== undefined) return override;
    const limit = plan?.limits?.[metric];
    return limit === undefined ? null : limit;
}

// Trials stop at the cap. Paid plans keep working and bill the overage.
export function usageDecision({ count, limit, hardCap = false }) {
    if (limit === null || limit === undefined || count <= limit) {
        return { allowed: true, overage: 0 };
    }
    return hardCap ? { allowed: false, overage: 0 } : { allowed: true, overage: count - limit };
}

export const isTrial = (sub) => sub?.status === "trialing";
export const trialEnd = (from = new Date(), days = 14) =>
    new Date(from.getTime() + days * 86400000);
export const seatsAvailable = (used, limit) =>
    limit === null || limit === undefined || used < limit;

// Stripe statuses -> ours
export const mapStripeStatus = (s) =>
({
    trialing: "trialing",
    active: "active",
    past_due: "past_due",
    unpaid: "past_due",
    incomplete: "incomplete",
    canceled: "canceled",
    incomplete_expired: "canceled",
    paused: "canceled",
}[s] ?? "incomplete");

// Default export (bundle everything together)
export default {
    effectiveFeatures,
    effectiveLimit,
    usageDecision,
    isTrial,
    trialEnd,
    seatsAvailable,
    mapStripeStatus,
};
