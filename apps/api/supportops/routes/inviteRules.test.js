import test from "node:test";
import assert from "node:assert/strict";
import { INVITABLE_ROLES, roleAllowed, validEmail, normEmail, newToken, hashToken, inviteExpiry, inviteProblem } from "./inviteRules.js";

const now = new Date("2026-10-10T10:00:00Z");
const good = { email: "Joy@Acme.com", status: "pending", expires_at: "2026-10-12T00:00:00Z" };

test("Only agent, management and investor can be invited; admin cannot", () => {
    assert.deepEqual(INVITABLE_ROLES, ["agent", "management", "investor"]);
    assert.equal(roleAllowed("admin"), false);
    assert.equal(roleAllowed("owner"), false);
    assert.equal(roleAllowed("agent"), true);
});

test("Emails", () => {
    assert.equal(validEmail(" joy@acme.com "), true);
    assert.equal(validEmail("not-an-email"), false);
    assert.equal(validEmail(""), false);
    assert.equal(normEmail("  Joy@ACME.com "), "joy@acme.com");
});

test("Tokens are random, long, and only their hash is comparable", () => {
    const a = newToken(), b = newToken();
    assert.notEqual(a, b);
    assert.ok(a.length >= 43);
    assert.equal(hashToken(a), hashToken(a));
    assert.notEqual(hashToken(a), hashToken(b));
    assert.notEqual(hashToken(a), a);
});

test("Expiry is 7 days", () => {
    assert.equal(inviteExpiry(now).toISOString(), "2026-10-17T10:00:00.000Z");
});

test("An invite can be used only when pending, unexpired and sent to the same email", () => {
    assert.equal(inviteProblem(good, "joy@acme.com", now), null);        // case-insensitive match
    assert.equal(inviteProblem(good, undefined, now), null);              // public preview, no user yet
    assert.equal(inviteProblem(null, "x@y.z", now).code, "INVITE_NOT_FOUND");
    assert.equal(inviteProblem({ ...good, status: "accepted" }, "joy@acme.com", now).code, "INVITE_USED");
    assert.equal(inviteProblem({ ...good, status: "revoked" }, "joy@acme.com", now).code, "INVITE_USED");
    assert.equal(inviteProblem({ ...good, expires_at: "2026-10-09T00:00:00Z" }, "joy@acme.com", now).code, "INVITE_EXPIRED");
    assert.equal(inviteProblem(good, "someone.else@acme.com", now).code, "EMAIL_MISMATCH");
});