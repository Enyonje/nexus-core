
// scripts/seed-plans.js
// Run: node scripts/seed-plans.js
// Additive and safe to rerun. Does not modify Nexus Core records.

import { prisma } from "../lib/deps.js";

const ALL_CHANNELS = [
    "channel_email",
    "channel_web",
    "channel_sms",
    "channel_whatsapp",
    "channel_voice",
    "channel_social"
];

const appData = {
    slug: "supportops",
    name: "SupportOps",
    roles: ["agent", "investor", "management", "admin"],
    default_role: "agent",
    active: true
};

const plans = [
    {
        key: "starter",
        name: "Starter / Team",
        audience: "TEAM",
        price_cents: 19900,
        features: ["triage_basic", "channel_email"],
        limits: { seats: 5, ai_resolutions: 500, overage_cents: 40 }
    },
    {
        key: "growth",
        name: "Pro / Growth",
        audience: "TEAM",
        price_cents: 69900,
        features: [
            "triage_basic",
            "channel_email",
            "channel_web",
            "helpdesk_sync",
            "sla_predict"
        ],
        limits: { seats: 20, ai_resolutions: 2500, overage_cents: 30 }
    },
    {
        key: "enterprise",
        name: "Enterprise",
        audience: "TEAM",
        price_cents: null,
        features: [
            "triage_basic",
            ...ALL_CHANNELS,
            "helpdesk_sync",
            "sla_predict",
            "webhooks",
            "sso",
            "rbac",
            "audit_logs",
            "dev_integrations",
            "tenant_isolation"
        ],
        limits: { seats: null, ai_resolutions: null }
    }
];

const addons = [
    { key: "channel_whatsapp", name: "WhatsApp Business", price_cents: 7900, features: ["channel_whatsapp"] },
    { key: "channel_voice", name: "Phone / voice", price_cents: 9900, features: ["channel_voice"] },
    { key: "channel_social", name: "Social inbox", price_cents: 4900, features: ["channel_social"] },
    { key: "channel_sms", name: "SMS", price_cents: 4900, features: ["channel_sms"] },
    { key: "audit_logs", name: "Compliance & audit logs", price_cents: 9900, features: ["audit_logs"] },
    { key: "dev_integrations", name: "Jira / GitHub integrations", price_cents: 4900, features: ["dev_integrations"] }
];

try {
    let app = await prisma.app.findUnique({
        where: { slug: "supportops" }
    });

    if (!app) {
        app = await prisma.app.create({ data: appData });
        console.log("CREATED APP: supportops");
    } else {
        console.log("EXISTING APP:", app.id);
    }

    if (!app.active) {
        throw new Error("SupportOps app is inactive. No records changed.");
    }

    for (const plan of plans) {
        const existing = await prisma.plan.findUnique({
            where: {
                app_id_key: { app_id: app.id, key: plan.key }
            }
        });

        if (existing) {
            console.log("EXISTING PLAN:", plan.key);
            continue;
        }

        await prisma.plan.create({
            data: { ...plan, app_id: app.id }
        });

        console.log("CREATED PLAN:", plan.key);
    }

    for (const addon of addons) {
        const existing = await prisma.addon.findUnique({
            where: {
                app_id_key: { app_id: app.id, key: addon.key }
            }
        });

        if (existing) {
            console.log("EXISTING ADDON:", addon.key);
            continue;
        }

        await prisma.addon.create({
            data: { ...addon, app_id: app.id }
        });

        console.log("CREATED ADDON:", addon.key);
    }

    const result = await prisma.app.findUnique({
        where: { slug: "supportops" },
        include: {
            plans: true,
            addons: true
        }
    });

    console.log("\nSUPPORTOPS SEED RESULT");
    console.log("App active:", result.active);
    console.log("Plans:", result.plans.map(p => `${p.key}: ${p.active ? "active" : "inactive"} `));
    console.log("Add-ons:", result.addons.length);

} catch (error) {
    console.error("SEED FAILED:", error);
    process.exitCode = 1;
} finally {
    await prisma.$disconnect();
}