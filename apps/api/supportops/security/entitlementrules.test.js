import test from "node:test";
import assert from "node:assert/strict";
import { effectiveFeatures, effectiveLimit, usageDecision, trialEnd, seatsAvailable, mapStripeStatus, isTrial } from "./entitlementRules.js";

const growth = { features: ["channel_email", "channel_web", "sla_predict"], limits: { seats: 20, ai_resolutions: 2500 } };
const starter = { features: ["channel_email"], limits: { seats: 5, ai_resolutions: 500 } };
const enterprise = { features: ["channel_email"], limits: { seats: null, ai_resolutions: null } };

test("Add-ons extend the plan without duplicates", () => {
    assert.deepEqual(effectiveFeatures(starter, [{ features: ["channel_whatsapp"] }, { features: ["channel_email", "audit_logs"] }]),
        ["channel_email", "channel_whatsapp", "audit_logs"]);
    assert.deepEqual(effectiveFeatures(null, []), []);
});

test("Limits: plan value, trial override, unlimited", () => {
    assert.equal(effectiveLimit(growth, {}, "ai_resolutions"), 2500);
    assert.equal(effectiveLimit(growth, { limit_overrides: { ai_resolutions: 100 } }, "ai_resolutions"), 100);
    assert.equal(effectiveLimit(enterprise, {}, "seats"), null);
    assert.equal(effectiveLimit(growth, {}, "unknown_metric"), null);
});

test("AI resolution metering: quota, overage, trial hard stop, unlimited", () => {
    assert.deepEqual(usageDecision({ count: 500, limit: 500 }), { allowed: true, overage: 0 });
    assert.deepEqual(usageDecision({ count: 503, limit: 500 }), { allowed: true, overage: 3 });
    assert.deepEqual(usageDecision({ count: 101, limit: 100, hardCap: true }), { allowed: false, overage: 0 });
    assert.deepEqual(usageDecision({ count: 99999, limit: null }), { allowed: true, overage: 0 });
});

test("Seats, trial dates and Stripe status mapping", () => {
    assert.equal(seatsAvailable(4, 5), true);
    assert.equal(seatsAvailable(5, 5), false);
    assert.equal(seatsAvailable(999, null), true);
    assert.equal(trialEnd(new Date("2026-10-01T00:00:00Z")).toISOString(), "2026-10-15T00:00:00.000Z");
    assert.equal(isTrial({ status: "trialing" }), true);
    assert.deepEqual(["trialing", "unpaid", "incomplete_expired", "weird"].map(mapStripeStatus), ["trialing", "past_due", "canceled", "incomplete"]);
});