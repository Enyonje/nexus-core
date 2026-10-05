/**
 * SupportOps Core Route Plugin
 * Path: supportops/routes/supportops.js
 */

import { guard } from "../security/entitlements.js";

export default async function supportopsRoutes(app) {
    const access = guard({ app: "supportops" });

    // Base endpoint: quick status check
    app.get("/", { preHandler: access }, async (req, reply) => {
        return reply.send({
            ok: true,
            service: "supportops-core",
            timestamp: new Date().toISOString(),
        });
    });

    // Example: list organizations
    app.get("/orgs", { preHandler: access }, async (req, reply) => {
        // Replace with Prisma query if needed
        return reply.send([
            { id: "org-123", name: "Acme Corp" },
            { id: "org-456", name: "Nexus Core" },
        ]);
    });

    // Example: analytics endpoint
    app.get("/analytics", { preHandler: access }, async (req, reply) => {
        // Replace with real DB query
        return reply.send({
            totalTickets: 1280,
            resolvedTickets: 1142,
            avgResponseTimeMinutes: 14.2,
            csatScore: 4.8,
            activeAgents: 12,
        });
    });

    // ✅ Do NOT define /tickets here — tickets.js owns that path
}
