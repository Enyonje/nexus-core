import test from "node:test";
import assert from "node:assert/strict";
import { buildApp } from "../src/app.js";
import { createMemoryStore } from "../src/auth/stores/memoryStore.js";
import { signAccessToken, verifyAccessToken } from "../src/auth/tokens.js";
import { REFRESH_REUSE_GRACE_MS } from "../src/auth/routes.js";

const env = { NODE_ENV: "test", JWT_SECRET: "x".repeat(40), COOKIE_SECRET: "c".repeat(20), FRONTEND_URL: "https://nexusthecore.com" };

async function setup() {
  const store = createMemoryStore();
  const app = await buildApp({ store, env, legacyRoutes: false, logger: false, getStripe: async () => null });
  return { app, store };
}

const cookieFrom = (res, name) => {
  const c = res.cookies.find((x) => x.name === name);
  return c ? `${name}=${c.value}` : "";
};

async function register(app, product, email = "ada@example.com", password = "correct-horse-battery") {
  return app.inject({ method: "POST", url: `/api/${product}/auth/register`, payload: { email, password, organization: "Acme" } });
}

test("register returns a session for that product only", async () => {
  const { app } = await setup();
  const res = await register(app, "nexus-core");
  assert.equal(res.statusCode, 201);
  const body = res.json();
  assert.equal(body.user.product, "nexus-core");
  assert.equal(body.user.role, "owner");
  assert.ok(cookieFrom(res, "nc_rt"), "nexus core refresh cookie is set");
  assert.equal(cookieFrom(res, "cb_rt"), "", "no compliance cookie");

  const me = await app.inject({ method: "GET", url: "/api/nexus-core/auth/me", headers: { authorization: `Bearer ${body.token}` } });
  assert.equal(me.statusCode, 200);
  assert.equal(me.json().user.email, "ada@example.com");
});

test("a Nexus Core token is rejected by Compliance and SupportOps", async () => {
  const { app } = await setup();
  const { token } = (await register(app, "nexus-core")).json();
  for (const product of ["compliance", "supportops"]) {
    const res = await app.inject({ method: "GET", url: `/api/${product}/auth/me`, headers: { authorization: `Bearer ${token}` } });
    assert.equal(res.statusCode, 401, `${product} must reject a nexus-core token`);
  }
});

test("each product signs with a different key even with one JWT_SECRET", () => {
  const t = signAccessToken("nexus-core", { sub: "u1" }, env);
  assert.equal(verifyAccessToken("nexus-core", t, env).sub, "u1");
  assert.throws(() => verifyAccessToken("compliance", t, env));
});

test("signing in to a product the account was never granted is refused", async () => {
  const { app } = await setup();
  await register(app, "compliance", "bea@example.com");
  const res = await app.inject({ method: "POST", url: "/api/supportops/auth/login", payload: { email: "bea@example.com", password: "correct-horse-battery" } });
  assert.equal(res.statusCode, 403);
  assert.equal(res.json().error, "AUTH_NO_PRODUCT_ACCESS");
});

test("registering for a second product with the same password adds access; wrong password does not", async () => {
  const { app } = await setup();
  await register(app, "nexus-core", "cy@example.com");
  const wrong = await register(app, "compliance", "cy@example.com", "a-different-password");
  assert.equal(wrong.statusCode, 409);
  const ok = await register(app, "compliance", "cy@example.com");
  assert.equal(ok.statusCode, 200);
  assert.equal(ok.json().user.product, "compliance");
  const login = await app.inject({ method: "POST", url: "/api/compliance/auth/login", payload: { email: "cy@example.com", password: "correct-horse-battery" } });
  assert.equal(login.statusCode, 200);
});

test("passwords shorter than 10 characters are rejected", async () => {
  const { app } = await setup();
  const res = await register(app, "nexus-core", "dee@example.com", "short");
  assert.equal(res.statusCode, 400);
  assert.equal(res.json().error, "AUTH_WEAK_PASSWORD");
});

test("5 wrong passwords lock the account for 15 minutes", async () => {
  const { app, store } = await setup();
  await register(app, "nexus-core", "eve@example.com");
  for (let i = 0; i < 5; i++) {
    await app.inject({ method: "POST", url: "/api/nexus-core/auth/login", payload: { email: "eve@example.com", password: "wrong-password-123" } });
  }
  const locked = await app.inject({ method: "POST", url: "/api/nexus-core/auth/login", payload: { email: "eve@example.com", password: "correct-horse-battery" } });
  assert.equal(locked.statusCode, 423);
  const user = await store.findUserByEmail("eve@example.com");
  const minutes = (new Date(user.locked_until) - Date.now()) / 60000;
  assert.ok(minutes > 14 && minutes <= 15);
});

test("a refreshed cookie replayed within 30 seconds (two tabs) still works", async () => {
  const { app } = await setup();
  const reg = await register(app, "nexus-core", "gus@example.com");
  const first = cookieFrom(reg, "nc_rt");
  const r1 = await app.inject({ method: "POST", url: "/api/nexus-core/auth/refresh", headers: { cookie: first } });
  assert.equal(r1.statusCode, 200);
  const tab2 = await app.inject({ method: "POST", url: "/api/nexus-core/auth/refresh", headers: { cookie: first } });
  assert.equal(tab2.statusCode, 200, "second tab keeps its session");
  assert.equal(REFRESH_REUSE_GRACE_MS, 30_000);
});

test("a rotated cookie replayed after the grace window ends the whole session", async () => {
  const store = createMemoryStore();
  // Grace window set to 0 so the replay below counts as "too late" without waiting 30 seconds.
  const app = await buildApp({ store, env: { ...env, AUTH_REFRESH_GRACE_SECONDS: "0" }, legacyRoutes: false, logger: false, getStripe: async () => null });
  const reg = await register(app, "nexus-core", "fay@example.com");
  const first = cookieFrom(reg, "nc_rt");
  const r1 = await app.inject({ method: "POST", url: "/api/nexus-core/auth/refresh", headers: { cookie: first } });
  assert.equal(r1.statusCode, 200);
  const second = cookieFrom(r1, "nc_rt");
  assert.notEqual(second, first);

  await new Promise((r) => setTimeout(r, 5));
  const replay = await app.inject({ method: "POST", url: "/api/nexus-core/auth/refresh", headers: { cookie: first } });
  assert.equal(replay.statusCode, 401);
  assert.equal(replay.json().error, "AUTH_SESSION_REVOKED");
  const afterTheft = await app.inject({ method: "POST", url: "/api/nexus-core/auth/refresh", headers: { cookie: second } });
  assert.equal(afterTheft.statusCode, 401, "the newer token of the same family is revoked too");
});

test("a cookie replayed right after log out does not sign back in", async () => {
  const { app } = await setup();
  const reg = await register(app, "nexus-core", "hal@example.com");
  const first = cookieFrom(reg, "nc_rt");
  await app.inject({ method: "POST", url: "/api/nexus-core/auth/logout", headers: { cookie: first } });
  const replay = await app.inject({ method: "POST", url: "/api/nexus-core/auth/refresh", headers: { cookie: first } });
  assert.equal(replay.statusCode, 401);
});

test("logging out of Compliance leaves the Nexus Core session alive", async () => {
  const { app } = await setup();
  const nc = await register(app, "nexus-core", "gus@example.com");
  const cb = await register(app, "compliance", "gus@example.com");
  await app.inject({ method: "POST", url: "/api/compliance/auth/logout", headers: { cookie: cookieFrom(cb, "cb_rt") } });
  const cbRefresh = await app.inject({ method: "POST", url: "/api/compliance/auth/refresh", headers: { cookie: cookieFrom(cb, "cb_rt") } });
  assert.equal(cbRefresh.statusCode, 401);
  const ncRefresh = await app.inject({ method: "POST", url: "/api/nexus-core/auth/refresh", headers: { cookie: cookieFrom(nc, "nc_rt") } });
  assert.equal(ncRefresh.statusCode, 200);
});

test("password reset link works once and only for the product that sent it", async () => {
  const sent = [];
  const store = createMemoryStore();
  const app = await buildApp({ store, env, legacyRoutes: false, logger: false, mailer: { sendPasswordReset: async (m) => sent.push(m) } });
  await register(app, "compliance", "hal@example.com");
  const forgot = await app.inject({ method: "POST", url: "/api/compliance/auth/forgot-password", payload: { email: "hal@example.com" } });
  assert.equal(forgot.statusCode, 200);
  assert.match(sent[0].link, /^https:\/\/nexusthecore\.com\/compliance\/reset-password\?token=/);
  const token = new URL(sent[0].link).searchParams.get("token");

  const wrongProduct = await app.inject({ method: "POST", url: "/api/nexus-core/auth/reset-password", payload: { token, password: "brand-new-password" } });
  assert.equal(wrongProduct.statusCode, 400);
  const ok = await app.inject({ method: "POST", url: "/api/compliance/auth/reset-password", payload: { token, password: "brand-new-password" } });
  assert.equal(ok.statusCode, 200);
  const again = await app.inject({ method: "POST", url: "/api/compliance/auth/reset-password", payload: { token, password: "another-new-password" } });
  assert.equal(again.statusCode, 400);
  const login = await app.inject({ method: "POST", url: "/api/compliance/auth/login", payload: { email: "hal@example.com", password: "brand-new-password" } });
  assert.equal(login.statusCode, 200);
});

test("forgot-password gives the same answer for unknown emails", async () => {
  const { app } = await setup();
  const res = await app.inject({ method: "POST", url: "/api/nexus-core/auth/forgot-password", payload: { email: "nobody@example.com" } });
  assert.equal(res.statusCode, 200);
  assert.equal(res.json().success, true);
});

test("legacy /api/auth paths still work for Nexus Core", async () => {
  const { app } = await setup();
  const res = await app.inject({ method: "POST", url: "/api/auth/register", payload: { email: "ivy@example.com", password: "correct-horse-battery" } });
  assert.equal(res.statusCode, 201);
  const me = await app.inject({ method: "GET", url: "/api/auth/me", headers: { authorization: `Bearer ${res.json().token}` } });
  assert.equal(me.statusCode, 200);
});

test("signed-out /me answers 401, not 500", async () => {
  const { app } = await setup();
  const res = await app.inject({ method: "GET", url: "/api/auth/me" });
  assert.equal(res.statusCode, 401);
});

test("a visitor with no session cookie gets 204 from refresh, not an error", async () => {
  const { app } = await setup();
  const res = await app.inject({ method: "POST", url: "/api/nexus-core/auth/refresh" });
  assert.equal(res.statusCode, 204);
});
