// apps/api/supportops/routes/readinessRoutes.js  Go-live checklist for the admin.  Mount: "/api/v1/supportops/readiness"
// A channel counts as WORKING only after it has received a real message.
import { prisma } from "../lib/deps.js";
import { guard } from "../security/entitlements.js";

const CHANNELS = { email: "Email", web: "In-app chat", sms: "SMS", whatsapp: "WhatsApp", voice: "Phone", social: "Social inbox" };

export default async function readinessRoutes(app) {
    app.get("/", { preHandler: guard({ app: "supportops", roles: ["admin"] }) }, async (req) => {
        const checks = [];
        const add = (key, label, ok, hint) => checks.push({ key, label, ok: Boolean(ok), hint: ok ? null : hint });
        const has = (k) => Boolean(process.env[k]);

        add("jwt", "Login secret", has("JWT_SECRET"), "Set JWT_SECRET on the server");
        add("enc", "Channel credential encryption", has("CHANNELS_ENC_KEY"), "Set CHANNELS_ENC_KEY (openssl rand -base64 32)");
        add("public_url", "Public https address for webhooks", (process.env.PUBLIC_API_URL ?? "").startsWith("https://"), "Set PUBLIC_API_URL to your https API address");
        add("app_url", "App address for invites and checkout", has("APP_URL"), "Set APP_URL to your frontend address");
        add("stripe", "Stripe payments", has("STRIPE_SECRET_KEY") && has("STRIPE_WEBHOOK_SECRET"), "Set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET");

        const unpriced = await prisma.plan.count({ where: { app_id: req.access.app.id, active: true, price_cents: { not: null }, stripe_price_id: null } });
        add("prices", "Stripe prices attached to every paid plan", unpriced === 0, `${unpriced} paid plan(s) have no Stripe price id`);

        const rows = await prisma.channel.findMany({ where: { org_id: req.access.org.id }, select: { key: true, last_event_at: true } });
        for (const [key, label] of Object.entries(CHANNELS)) {
            const row = rows.find((r) => r.key === key);
            const allowed = req.access.features.includes(`channel_${key}`);
            add(`channel_${key}`, `${label} receiving messages`, row?.last_event_at,
                !allowed ? "Not in your plan. Add it on the pricing page" : !row ? "Not connected yet. Connect it in Channels" : "Connected. Send a test message to confirm");
        }
        return checks;
    });
}