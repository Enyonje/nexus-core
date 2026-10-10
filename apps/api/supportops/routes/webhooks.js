// src/routes/webhooks.js
import { prisma } from "../../src/config/prisma.js";

export async function webhookRoutes(app) {
    /* ==================== WHATSAPP / META WEBHOOK ==================== */
    // 1. Meta Webhook Verification (GET)
    app.get("/webhooks/whatsapp", async (req, reply) => {
        const mode = req.query["hub.mode"];
        const token = req.query["hub.verify_token"];
        const challenge = req.query["hub.challenge"];

        const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || "nexus_secret_token";

        if (mode === "subscribe" && token === VERIFY_TOKEN) {
            return reply.code(200).send(challenge);
        }
        return reply.code(403).send("Forbidden");
    });

    // 2. Incoming WhatsApp Messages (POST)
    app.post("/webhooks/whatsapp", async (req, reply) => {
        try {
            const entry = req.body?.entry?.[0];
            const change = entry?.changes?.[0]?.value;
            const message = change?.messages?.[0];
            const contact = change?.contacts?.[0];

            if (message) {
                const customerName = contact?.profile?.name || message.from;
                const textBody = message.text?.body || "New media/interactive message";

                // Create real ticket in PostgreSQL
                await prisma.ticket.create({
                    data: {
                        subject: textBody.substring(0, 80),
                        customer: customerName,
                        channel: "whatsapp",
                        priority: "high",
                        status: "open",
                    },
                });
            }

            return reply.code(200).send({ status: "EVENT_RECEIVED" });
        } catch (err) {
            req.log.error("WhatsApp webhook error:", err);
            return reply.code(200).send({ status: "ACK" }); // Always respond 200 to Meta
        }
    });

    /* ==================== TWILIO VOICE / PHONE WEBHOOK ==================== */
    app.post("/webhooks/twilio/voice", async (req, reply) => {
        try {
            const caller = req.body?.From || "Unknown Caller";
            const callSid = req.body?.CallSid || `CALL-${Date.now()}`;

            await prisma.ticket.create({
                data: {
                    subject: `Inbound Call from ${caller}`,
                    customer: caller,
                    channel: "voice",
                    priority: "urgent",
                    status: "open",
                },
            });

            // TwiML response telling Twilio what to say
            reply.type("text/xml");
            return reply.send(
                `<Response><Say>Thank you for calling Nexus Core support. A ticket has been created for your agent.</Say></Response>`
            );
        } catch (err) {
            req.log.error("Twilio Voice error:", err);
            reply.type("text/xml");
            return reply.send(`<Response><Say>An error occurred.</Say></Response>`);
        }
    });

    /* ==================== INBOUND EMAIL WEBHOOK ==================== */
    app.post("/webhooks/email", async (req, reply) => {
        try {
            const sender = req.body?.from || req.body?.sender || "Customer";
            const subject = req.body?.subject || "No Subject Email";

            await prisma.ticket.create({
                data: {
                    subject,
                    customer: sender,
                    channel: "email",
                    priority: "normal",
                    status: "open",
                },
            });

            return reply.code(200).send({ success: true });
        } catch (err) {
            return reply.code(500).send({ error: err.message });
        }
    });
}

export default webhookRoutes;