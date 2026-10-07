// scripts/seed-plans.js  Run after the migration:  node scripts/seed-plans.js   (safe to re-run)
// PRICES ARE PLACEHOLDERS inside your stated ranges. Set Stripe price ids afterwards (see bottom).
// Limits: null = unlimited. overage_cents = price per AI resolution beyond the included quota.
import { prisma } from "../lib/deps.js";

const ALL_CHANNELS = ["channel_email", "channel_web", "channel_sms", "channel_whatsapp", "channel_voice", "channel_social"];

const APPS = [
    {
        slug: "nexus-core", name: "Nexus Core", roles: ["member", "admin"], default_role: "member",
        plans: [
            { key: "free", name: "Free", audience: "BOTH", price_cents: 0, features: ["executions"], limits: { seats: 1, executions: 50 } },
            { key: "pro", name: "Pro", audience: "BOTH", price_cents: 4900, features: ["executions", "streams"], limits: { seats: 5, executions: 2000 } },
            { key: "enterprise", name: "Enterprise", audience: "TEAM", price_cents: null, features: ["executions", "streams", "audit"], limits: { seats: null, executions: null } },
        ],
        addons: [],
    },
    {
        slug: "supportops", name: "SupportOps", roles: ["agent", "investor", "management", "admin"], default_role: "agent",
        plans: [
            {
                key: "starter", name: "Starter / Team", audience: "TEAM", price_cents: 19900,
                features: ["triage_basic", "channel_email"], limits: { seats: 5, ai_resolutions: 500, overage_cents: 40 }
            },
            {
                key: "growth", name: "Pro / Growth", audience: "TEAM", price_cents: 69900,
                features: ["triage_basic", "channel_email", "channel_web", "helpdesk_sync", "sla_predict"], limits: { seats: 20, ai_resolutions: 2500, overage_cents: 30 }
            },
            {
                key: "enterprise", name: "Enterprise", audience: "TEAM", price_cents: null,
                features: ["triage_basic", ...ALL_CHANNELS, "helpdesk_sync", "sla_predict", "webhooks", "sso", "rbac", "audit_logs", "dev_integrations", "tenant_isolation"],
                limits: { seats: null, ai_resolutions: null }
            },
        ],
        addons: [
            { key: "channel_whatsapp", name: "WhatsApp Business", price_cents: 7900, features: ["channel_whatsapp"] },
            { key: "channel_voice", name: "Phone / voice", price_cents: 9900, features: ["channel_voice"] },
            { key: "channel_social", name: "Social inbox", price_cents: 4900, features: ["channel_social"] },
            { key: "channel_sms", name: "SMS", price_cents: 4900, features: ["channel_sms"] },
            { key: "audit_logs", name: "Compliance & audit logs", price_cents: 9900, features: ["audit_logs"] },
            { key: "dev_integrations", name: "Jira / GitHub integrations", price_cents: 4900, features: ["dev_integrations"] },
        ],
    },
];

for (const { plans, addons, ...appData } of APPS) {
    const app = await prisma.app.upsert({ where: { slug: appData.slug }, update: appData, create: appData });
    for (const p of plans) {
        await prisma.plan.upsert({ where: { app_id_key: { app_id: app.id, key: p.key } }, update: p, create: { ...p, app_id: app.id } });
    }
    for (const a of addons) {
        await prisma.addon.upsert({ where: { app_id_key: { app_id: app.id, key: a.key } }, update: a, create: { ...a, app_id: app.id } });
    }
    console.log(`Seeded ${app.slug}: ${plans.length} plans, ${addons.length} add-ons`);
}

// After creating the products and prices in Stripe, attach them:
//   UPDATE plans  SET stripe_price_id = 'price_xxx' WHERE key = 'growth' AND app_id = (SELECT id FROM apps WHERE slug='supportops');
//   UPDATE addons SET stripe_price_id = 'price_yyy' WHERE key = 'channel_whatsapp';
await prisma.$disconnect();