/**
 * Legacy global SupportOps webhooks are intentionally disabled.
 *
 * They previously accepted provider events without tenant-bound channel
 * credentials and attempted writes through an obsolete `prisma.ticket` model.
 * Use the per-workspace channel endpoints registered by channelsRoutes instead:
 *   /api/v1/supportops/tickets/channels/webhook/:key/:opaqueToken
 */
export default async function legacySupportOpsWebhooks(app) {
    const gone = async (_request, reply) => reply.code(410).send({
        error: "LEGACY_WEBHOOK_DISABLED",
        message: "This global webhook endpoint is retired. Reconnect the channel in SupportOps Admin > Channels and use its organization-specific webhook URL.",
    });

    for (const url of [
        "/webhooks/whatsapp",
        "/webhooks/twilio/voice",
        "/webhooks/email",
    ]) {
        app.route({ method: ["GET", "POST"], url, handler: gone });
    }
}

export { legacySupportOpsWebhooks };
