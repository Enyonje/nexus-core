import test from "node:test";
import assert from "node:assert/strict";
import { chooseActiveMembership, subscriptionUsable } from "../security/workspaceAccessRules.js";

const personal = { org_id: "org-personal", org: { type: "PERSONAL" } };
const team = { org_id: "org-team", org: { type: "TEAM" } };
const otherTeam = { org_id: "org-other", org: { type: "TEAM" } };

test("active workspace prefers the account's primary organization", () => {
    assert.equal(chooseActiveMembership([personal, team], "org-team").org_id, "org-team");
});

test("active workspace falls back to personal then first membership", () => {
    assert.equal(chooseActiveMembership([team, personal], null).org_id, "org-personal");
    assert.equal(chooseActiveMembership([team, otherTeam], null).org_id, "org-team");
    assert.equal(chooseActiveMembership([], null), null);
});

test("explicit workspace selection only resolves an existing membership", () => {
    assert.equal(chooseActiveMembership([personal, team], null, "org-team").org_id, "org-team");
    assert.equal(chooseActiveMembership([personal, team], null, "org-outsider"), null);
});

test("subscription states fail closed", () => {
    assert.equal(subscriptionUsable({ status: "active" }), true);
    assert.equal(subscriptionUsable({ status: "trialing", trial_ends_at: new Date(Date.now() + 60_000) }), true);
    assert.equal(subscriptionUsable({ status: "trialing", trial_ends_at: new Date(Date.now() - 60_000) }), false);
    assert.equal(subscriptionUsable(null), false);
    assert.equal(subscriptionUsable({ status: "incomplete" }), false);
});
