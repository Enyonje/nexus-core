const BILLING_GRACE_MS = 3 * 24 * 60 * 60 * 1000;

/** Resolve a requested workspace only from memberships already loaded for this user. */
export function chooseActiveMembership(memberships, preferredOrgId, requestedOrgId) {
    if (requestedOrgId) return memberships.find((m) => m.org_id === requestedOrgId) ?? null;
    return memberships.find((m) => m.org_id === preferredOrgId)
        ?? memberships.find((m) => m.org?.type === "PERSONAL")
        ?? memberships[0]
        ?? null;
}

/** Subscription access policy shared by API guards and session construction. */
export function subscriptionUsable(sub, now = new Date()) {
    if (!sub) return false;
    if (sub.status === "active") return true;
    if (sub.status === "trialing") return !sub.trial_ends_at || sub.trial_ends_at > now;
    if (sub.status === "past_due" && sub.current_period_end) {
        return now.getTime() < sub.current_period_end.getTime() + BILLING_GRACE_MS;
    }
    return false;
}
