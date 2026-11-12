// apps/api/supportops/routes/billingRoutes.js
// Pricing, Stripe checkout, guest setup, trials, and Stripe webhooks.
// Register: await app.register(billingRoutes, { prefix: "/api/v1/billing" });
// Env: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, APP_URL (frontend)

import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "../config/prisma.js";
import { requireAuth } from "../lib/deps.js";
import { createAccessToken } from "../services/authTokens.js";
import { generateRandomToken, hashToken } from "../services/authTokens.js";
import { AccessError, invalidateSubscription } from "../security/entitlements.js";
import { mapStripeStatus, trialEnd } from "../security/entitlementRules.js";

const stripe = async () => {
    const { default: Stripe } = await import("stripe");
    return new Stripe(process.env.STRIPE_SECRET_KEY);
};

const fail = (reply, e) =>
    e instanceof AccessError ? reply.code(e.status).send({ error: e.code, message: e.message }) : null;

// Only owner, admin or billing contacts can modify workspace billing
async function billingOrg(req) {
    const requestedOrgId = req.headers["x-org-id"];
    const orgId = requestedOrgId || req.user.org_id || undefined;
    const m = await prisma.membership.findFirst({
        where: {
            user_id: req.user.id,
            ...(orgId ? { org_id: orgId } : {}),
            org_role: { in: ["owner", "admin", "billing"] },
            org: { deleted_at: null },
        },
        include: { org: true },
    });
    if (!m) {
        throw new AccessError(
            403,
            "BILLING_FORBIDDEN",
            "Only an owner, admin or billing contact can change the plan"
        );
    }
    return m.org;
}

export default async function billingRoutes(app) {
    // Public pricing plans endpoint
    app.get("/plans", async (req) => {
        const slug = req.query?.app || "supportops";
        const apps = await prisma.app.findMany({
            where: { active: true, ...(slug ? { slug } : {}) },
            include: { plans: { where: { active: true } }, addons: true },
        });

        return apps.map((a) => ({
            app: a.slug,
            name: a.name,
            plans: a.plans.map(({ key, name, price_cents, features, limits }) => ({
                key,
                name,
                priceCents: price_cents,
                features,
                limits,
            })),
            addons: a.addons.map(({ key, name, price_cents, features }) => ({
                key,
                name,
                priceCents: price_cents,
                features,
            })),
        }));
    });

    // Guest-first workspace provisioning. The guest receives the same signed
    // session contract and refresh-cookie lifecycle as a normal registered user.
    // Existing accounts must sign in; never create a second workspace against an
    // existing email address without explicit authenticated intent.
    app.post("/guest-checkout", async (req, reply) => {
        let createdOrgId = null;
        let stripeCustomerId = null;
        try {
            const {
                email,
                workspaceName,
                fullName,
                app: slug = "supportops",
                plan: planKey,
                mode = "checkout",
                addons = [],
            } = req.body ?? {};

            const cleanEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
            const cleanWorkspace = typeof workspaceName === "string" ? workspaceName.trim() : "";
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) || cleanEmail.length > 254 || cleanWorkspace.length < 2 || cleanWorkspace.length > 120) {
                return reply.code(400).send({
                    error: "INVALID_GUEST_DETAILS",
                    message: "Enter a valid email address and a workspace name between 2 and 120 characters.",
                });
            }
            if (mode !== "trial" && mode !== "checkout") {
                return reply.code(400).send({ error: "INVALID_CHECKOUT_MODE", message: "Unsupported checkout mode." });
            }
            if (!Array.isArray(addons) || addons.length > 20 || addons.some((key) => typeof key !== "string")) {
                return reply.code(400).send({ error: "INVALID_ADDONS", message: "Invalid add-on selection." });
            }

            const existingUser = await prisma.user.findUnique({ where: { email: cleanEmail }, select: { id: true } });
            if (existingUser) {
                return reply.code(409).send({
                    error: "ACCOUNT_EXISTS",
                    message: "An account already exists for this email. Sign in first, then choose a workspace and plan.",
                });
            }

            // Validate all commercial configuration before creating any records.
            const targetApp = await prisma.app.findFirst({
                where: { slug, active: true },
                include: { plans: { where: { active: true } }, addons: { where: { active: true } } },
            });
            if (!targetApp) return reply.code(404).send({ error: "APP_NOT_FOUND", message: "The selected product is unavailable." });
            const plan = mode === "trial"
                ? targetApp.plans.find((p) => p.key === "growth")
                : targetApp.plans.find((p) => p.key === planKey);
            if (!plan) return reply.code(400).send({ error: "PLAN_NOT_FOUND", message: "The selected plan is unavailable." });
            if (mode === "checkout" && !plan.stripe_price_id) {
                return reply.code(400).send({ error: "PLAN_NOT_PURCHASABLE", message: "This plan is not configured for online checkout. Contact sales." });
            }
            const chosenAddons = targetApp.addons.filter((x) => addons.includes(x.key) && x.stripe_price_id);
            if (mode === "checkout" && addons.some((key) => !chosenAddons.some((x) => x.key === key))) {
                return reply.code(400).send({ error: "ADDON_NOT_PURCHASABLE", message: "One or more selected add-ons are unavailable." });
            }

            const userId = uuidv4();
            const orgId = uuidv4();
            const rawRefreshToken = generateRandomToken(64);
            const rawSetupToken = generateRandomToken(48);
            const passwordHash = await bcrypt.hash(generateRandomToken(48), 12);
            const rawName = typeof fullName === "string" ? fullName.trim().slice(0, 120) : "";
            const expiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
            const trialEndsAt = mode === "trial" ? trialEnd() : null;

            const provisioned = await prisma.$transaction(async (tx) => {
                const org = await tx.organization.create({
                    data: { id: orgId, name: cleanWorkspace, type: "TEAM", owner_id: userId },
                });
                const user = await tx.user.create({
                    data: {
                        id: userId,
                        email: cleanEmail,
                        name: rawName || cleanEmail.split("@")[0],
                        password_hash: passwordHash,
                        role: "user",
                        subscription: "free",
                        org_id: org.id,
                        refresh_token: hashToken(rawRefreshToken),
                        refresh_token_expires: expiry,
                        reset_token: hashToken(rawSetupToken),
                        reset_token_expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
                    },
                });
                await tx.membership.create({ data: { org_id: org.id, user_id: user.id, org_role: "owner" } });
                await tx.appAccess.create({
                    data: { org_id: org.id, user_id: user.id, app_id: targetApp.id, app_role: "admin" },
                });
                if (mode === "trial") {
                    await tx.subscription.create({
                        data: {
                            org_id: org.id,
                            app_id: targetApp.id,
                            plan_id: plan.id,
                            status: "trialing",
                            trial_ends_at: trialEndsAt,
                            limit_overrides: { ai_resolutions: 100 },
                        },
                    });
                }
                return { org, user };
            });
            createdOrgId = provisioned.org.id;

            // A guest account is provisioned with a random unknown password. Send a
            // one-time password setup link before completing checkout so the owner
            // can recover access after the initial browser session expires.
            const { sendPasswordResetEmail } = await import("../services/mailer.js");
            const identityFrontendUrl = process.env.IDENTITY_FRONTEND_URL || "https://nexusthecore.com";
            const setupUrl = `${identityFrontendUrl.replace(/\/$/, "")}/reset-password?token=${encodeURIComponent(rawSetupToken)}`;
            await sendPasswordResetEmail(cleanEmail, setupUrl, { purpose: "setup" });

            let checkoutUrl = null;
            if (mode === "checkout") {
                const s = await stripe();
                const customer = await s.customers.create({
                    email: cleanEmail,
                    name: provisioned.org.name,
                    metadata: { orgId: provisioned.org.id, userId: provisioned.user.id, appSlug: slug },
                }, { idempotencyKey: `nexus-customer-${provisioned.org.id}` });
                stripeCustomerId = customer.id;
                await prisma.organization.update({ where: { id: provisioned.org.id }, data: { stripe_customer_id: customer.id } });

                const metadata = {
                    orgId: provisioned.org.id,
                    userId: provisioned.user.id,
                    appSlug: slug,
                    planKey: plan.key,
                    addons: chosenAddons.map((x) => x.key).join(","),
                };
                const session = await s.checkout.sessions.create({
                    mode: "subscription",
                    customer: customer.id,
                    line_items: [
                        { price: plan.stripe_price_id, quantity: 1 },
                        ...chosenAddons.map((x) => ({ price: x.stripe_price_id, quantity: 1 })),
                    ],
                    subscription_data: { metadata },
                    metadata,
                    success_url: `${process.env.APP_URL || process.env.FRONTEND_URL}/supportops/success?session_id={CHECKOUT_SESSION_ID}`,
                    cancel_url: `${process.env.APP_URL || process.env.FRONTEND_URL}/supportops/cancel`,
                }, { idempotencyKey: `nexus-checkout-${provisioned.org.id}-${plan.key}` });
                checkoutUrl = session.url;
            }

            const token = createAccessToken({
                id: provisioned.user.id,
                email: provisioned.user.email,
                role: provisioned.user.role,
                subscription: provisioned.user.subscription,
                org_id: provisioned.org.id,
            }, provisioned.org.name);

            const sameSite = ["strict", "lax", "none"].includes(process.env.COOKIE_SAMESITE)
                ? process.env.COOKIE_SAMESITE : "strict";
            reply.setCookie("refreshToken", rawRefreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production" || sameSite === "none",
                sameSite,
                path: "/api/auth",
                maxAge: 30 * 24 * 60 * 60,
            });

            if (mode === "trial") invalidateSubscription(provisioned.org.id, targetApp.id);
            return reply.code(201).send({
                success: true,
                token,
                orgId: provisioned.org.id,
                url: checkoutUrl,
                redirectTo: mode === "trial" ? "/supportops/admin/executive" : null,
                trialEndsAt,
            });
        } catch (e) {
            // Roll back newly provisioned records when Stripe setup fails.
            if (createdOrgId) {
                await prisma.$transaction([
                    prisma.appAccess.deleteMany({ where: { org_id: createdOrgId } }),
                    prisma.subscription.deleteMany({ where: { org_id: createdOrgId } }),
                    prisma.membership.deleteMany({ where: { org_id: createdOrgId } }),
                    prisma.user.deleteMany({ where: { org_id: createdOrgId } }),
                    prisma.organization.deleteMany({ where: { id: createdOrgId } }),
                ]).catch((cleanupError) => req.log?.error({ cleanupError }, "Guest provisioning cleanup failed"));
            }
            if (stripeCustomerId) {
                const s = await stripe().catch(() => null);
                await s?.customers.del(stripeCustomerId).catch((cleanupError) =>
                    req.log?.error({ cleanupError }, "Stripe customer cleanup failed")
                );
            }
            if (fail(reply, e)) return;
            req.log?.error({ err: e }, "Guest checkout failed");
            return reply.code(500).send({ error: "GUEST_CHECKOUT_FAILED", message: "We couldn't finish setting up your workspace. Please try again." });
        }
    });

    // Authenticated 14-day trial of Growth, capped at 100 AI resolutions
    app.post("/trial", { preHandler: requireAuth }, async (req, reply) => {
        try {
            const org = await billingOrg(req);
            const sup = await prisma.app.findUnique({
                where: { slug: req.body?.app ?? "supportops" },
                include: { plans: true },
            });
            const plan = sup?.plans.find((p) => p.key === "growth");
            if (!plan) return reply.code(404).send({ message: "No trial is available for this app" });

            if (
                await prisma.subscription.findUnique({
                    where: { org_id_app_id: { org_id: org.id, app_id: sup.id } },
                })
            ) {
                return reply.code(409).send({
                    error: "ALREADY_SUBSCRIBED",
                    message: "This workspace already has a subscription or used its trial",
                });
            }

            // Calculate once so the persisted expiry and API response are identical.
            const trialEndsAt = trialEnd();
            await prisma.subscription.create({
                data: {
                    org_id: org.id,
                    app_id: sup.id,
                    plan_id: plan.id,
                    status: "trialing",
                    trial_ends_at: trialEndsAt,
                    limit_overrides: { ai_resolutions: 100 },
                },
            });

            await prisma.appAccess.upsert({
                where: {
                    org_id_user_id_app_id: { org_id: org.id, user_id: req.user.id, app_id: sup.id },
                },
                update: {},
                create: { org_id: org.id, user_id: req.user.id, app_id: sup.id, app_role: "admin" },
            });

            return reply.code(201).send({ ok: true, trialEndsAt: trialEndsAt.toISOString(), plan: plan.key, trialDays: 14 });
        } catch (e) {
            if (fail(reply, e)) return;
            throw e;
        }
    });

    // Authenticated Stripe Checkout for an existing workspace
    app.post("/checkout", { preHandler: requireAuth }, async (req, reply) => {
        try {
            const org = await billingOrg(req);
            const { app: slug = "supportops", plan: planKey, addons = [] } = req.body ?? {};
            const a = await prisma.app.findUnique({
                where: { slug },
                include: { plans: true, addons: true },
            });
            const plan = a?.plans.find((p) => p.key === planKey);

            if (!plan?.stripe_price_id) {
                return reply.code(400).send({
                    message: "That plan is not available for self-serve checkout. Contact sales.",
                });
            }

            const chosen = a.addons.filter((x) => addons.includes(x.key) && x.stripe_price_id);

            const s = await stripe();
            let customer = org.stripe_customer_id;
            if (!customer) {
                customer = (
                    await s.customers.create({ name: org.name, metadata: { orgId: org.id } })
                ).id;
                await prisma.organization.update({
                    where: { id: org.id },
                    data: { stripe_customer_id: customer },
                });
            }

            const metadata = {
                orgId: org.id,
                userId: req.user.id,
                appSlug: slug,
                planKey,
                addons: chosen.map((x) => x.key).join(","),
            };

            const session = await s.checkout.sessions.create({
                mode: "subscription",
                customer,
                line_items: [
                    { price: plan.stripe_price_id, quantity: 1 },
                    ...chosen.map((x) => ({ price: x.stripe_price_id, quantity: 1 })),
                ],
                subscription_data: { metadata },
                metadata,
                success_url: `${process.env.APP_URL}/supportops/success`,
                cancel_url: `${process.env.APP_URL}/supportops/cancel`,
            });

            return { url: session.url };
        } catch (e) {
            if (fail(reply, e)) return;
            throw e;
        }
    });
}

/* ---------- Stripe Webhook Plugin ---------- */
export async function stripeWebhookPlugin(app) {
    if (app.hasContentTypeParser("application/json")) {
        app.removeContentTypeParser("application/json");
    }
    app.addContentTypeParser("application/json", { parseAs: "buffer" }, (req, body, done) =>
        done(null, body)
    );

    app.post("/stripe", async (req, reply) => {
        let event;
        try {
            event = (await stripe()).webhooks.constructEvent(
                req.body,
                req.headers["stripe-signature"],
                process.env.STRIPE_WEBHOOK_SECRET
            );
        } catch (err) {
            return reply.code(400).send({ message: "Invalid signature" });
        }

        try {
            await prisma.stripeEvent.create({ data: { id: event.id, type: event.type } });
        } catch (err) {
            if (err.code === "P2002") return { received: true, duplicate: true };
            throw err;
        }

        try {
            const obj = event.data.object;
            if (
                [
                    "customer.subscription.created",
                    "customer.subscription.updated",
                    "customer.subscription.deleted",
                ].includes(event.type)
            ) {
                await syncSubscription(obj, event.type === "customer.subscription.deleted");
            } else if (event.type === "invoice.payment_failed" && obj.subscription) {
                const linked = await prisma.subscription.findFirst({
                    where: { stripe_subscription_id: obj.subscription },
                    select: { org_id: true, app_id: true },
                });
                await prisma.subscription.updateMany({
                    where: { stripe_subscription_id: obj.subscription },
                    data: { status: "past_due" },
                });
                if (linked) invalidateSubscription(linked.org_id, linked.app_id);
            }
        } catch (err) {
            await prisma.stripeEvent.delete({ where: { id: event.id } }).catch(() => { });
            throw err;
        }
        return { received: true };
    });
}

async function syncSubscription(sub, deleted) {
    const { orgId, userId, appSlug, planKey, addons = "" } = sub.metadata ?? {};
    if (!orgId || !appSlug || !planKey) return;

    const app = await prisma.app.findUnique({
        where: { slug: appSlug },
        include: { plans: true, addons: true },
    });
    const plan = app?.plans.find((p) => p.key === planKey);
    if (!plan) return;

    const status = deleted ? "canceled" : mapStripeStatus(sub.status);
    const periodEnd = sub.current_period_end ?? sub.items?.data?.[0]?.current_period_end;
    const data = {
        plan_id: plan.id,
        status,
        quantity: 1,
        cancel_at_period_end: Boolean(sub.cancel_at_period_end),
        stripe_subscription_id: sub.id,
        ...(periodEnd ? { current_period_end: new Date(periodEnd * 1000) } : {}),
        ...(status === "active" ? { limit_overrides: null, trial_ends_at: null } : {}),
    };

    const row = await prisma.subscription.upsert({
        where: { org_id_app_id: { org_id: orgId, app_id: app.id } },
        update: data,
        create: { org_id: orgId, app_id: app.id, ...data },
    });

    const wanted = app.addons.filter((a) => addons.split(",").includes(a.key));
    await prisma.subscriptionAddon.deleteMany({
        where: { subscription_id: row.id, addon_id: { notIn: wanted.map((a) => a.id) } },
    });

    for (const a of wanted) {
        await prisma.subscriptionAddon.upsert({
            where: { subscription_id_addon_id: { subscription_id: row.id, addon_id: a.id } },
            update: {},
            create: { subscription_id: row.id, addon_id: a.id },
        });
    }

    if (userId) {
        await prisma.appAccess.upsert({
            where: { org_id_user_id_app_id: { org_id: orgId, user_id: userId, app_id: app.id } },
            update: {},
            create: {
                org_id: orgId,
                user_id: userId,
                app_id: app.id,
                app_role: app.roles?.includes("admin") ? "admin" : app.default_role || "member",
            },
        });
    }
    invalidateSubscription(orgId, app.id);
}