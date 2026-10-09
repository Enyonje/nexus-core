// apps/api/supportops/routes/billingRoutes.js
// Pricing, Stripe checkout, guest setup, trials, and Stripe webhooks.
// Register: await app.register(billingRoutes, { prefix: "/api/v1/billing" });
// Env: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, APP_URL (frontend)

import { prisma, requireAuth } from "../lib/deps.js";
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
    const orgId = req.headers["x-org-id"];
    const m = await prisma.membership.findFirst({
        where: {
            user_id: req.user.id,
            ...(orgId ? { org_id: orgId } : { org: { type: "PERSONAL" } }),
            org_role: { in: ["owner", "admin", "billing"] },
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

    // Guest-First Direct Checkout (No pre-registration required)
    app.post("/guest-checkout", async (req, reply) => {
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

            if (!email || !workspaceName) {
                return reply.code(400).send({
                    error: "MISSING_FIELDS",
                    message: "Email and workspace name are required.",
                });
            }

            // 1. Provision or locate User record
            const cleanEmail = email.trim().toLowerCase();
            let user = await prisma.user.findUnique({ where: { email: cleanEmail } });
            if (!user) {
                user = await prisma.user.create({
                    data: {
                        email: cleanEmail,
                        name: fullName?.trim() || cleanEmail.split("@")[0],
                    },
                });
            }

            // 2. Provision new workspace / Organization
            const org = await prisma.organization.create({
                data: {
                    name: workspaceName.trim(),
                    type: "TEAM",
                    memberships: {
                        create: {
                            user_id: user.id,
                            org_role: "owner",
                        },
                    },
                },
            });

            // 3. Retrieve target App & Plan
            const targetApp = await prisma.app.findUnique({
                where: { slug },
                include: { plans: true, addons: true },
            });

            if (!targetApp) {
                return reply.code(404).send({ message: `App '${slug}' not found` });
            }

            const plan = targetApp.plans.find((p) => p.key === planKey);

            // Handle Trial Mode Request
            if (mode === "trial") {
                const growthPlan = targetApp.plans.find((p) => p.key === "growth");
                await prisma.subscription.create({
                    data: {
                        org_id: org.id,
                        app_id: targetApp.id,
                        plan_id: growthPlan?.id || plan?.id,
                        status: "trialing",
                        trial_ends_at: trialEnd(),
                        limit_overrides: { ai_resolutions: 100 },
                    },
                });

                await prisma.appAccess.create({
                    data: {
                        org_id: org.id,
                        user_id: user.id,
                        app_id: targetApp.id,
                        app_role: "admin",
                    },
                });

                // Generate authentication session token for guest handoff
                const token = app.jwt.sign({ id: user.id, orgId: org.id });

                return reply.code(201).send({
                    success: true,
                    token,
                    orgId: org.id,
                    url: `${process.env.APP_URL || ""}/admin`,
                });
            }

            // Handle Paid Stripe Checkout Mode Request
            if (!plan?.stripe_price_id) {
                return reply.code(400).send({
                    message: "That plan is not available for self-serve checkout. Contact sales.",
                });
            }

            const chosenAddons = targetApp.addons.filter(
                (x) => addons.includes(x.key) && x.stripe_price_id
            );

            const s = await stripe();
            const customer = (
                await s.customers.create({
                    email: cleanEmail,
                    name: org.name,
                    metadata: { orgId: org.id, userId: user.id },
                })
            ).id;

            await prisma.organization.update({
                where: { id: org.id },
                data: { stripe_customer_id: customer },
            });

            const metadata = {
                orgId: org.id,
                userId: user.id,
                appSlug: slug,
                planKey,
                addons: chosenAddons.map((x) => x.key).join(","),
            };

            const session = await s.checkout.sessions.create({
                mode: "subscription",
                customer,
                line_items: [
                    { price: plan.stripe_price_id, quantity: 1 },
                    ...chosenAddons.map((x) => ({ price: x.stripe_price_id, quantity: 1 })),
                ],
                subscription_data: { metadata },
                metadata,
                success_url: `${process.env.APP_URL}/supportops/success?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${process.env.APP_URL}/supportops/cancel`,
            });

            const token = app.jwt ? app.jwt.sign({ id: user.id, orgId: org.id }) : null;

            return { url: session.url, token };
        } catch (e) {
            if (fail(reply, e)) return;
            req.log?.error(e);
            return reply.code(500).send({ error: "GUEST_CHECKOUT_FAILED", message: e.message });
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

            await prisma.subscription.create({
                data: {
                    org_id: org.id,
                    app_id: sup.id,
                    plan_id: plan.id,
                    status: "trialing",
                    trial_ends_at: trialEnd(),
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

            return reply.code(201).send({ ok: true, trialEndsAt: trialEnd() });
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
                await prisma.subscription.updateMany({
                    where: { stripe_subscription_id: obj.subscription },
                    data: { status: "past_due" },
                });
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