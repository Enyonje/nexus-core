// src/routes/supportops.js
import { requireAuth } from "./authMiddleware.js";
import { prisma } from "../../src/config/prisma.js"; // Or adjust to your correct prisma path if needed

export async function supportopsRoutes(app) {
    // GET /tickets & /supportops/tickets (Real database records)
    const getTickets = async (req, reply) => {
        try {
            let tickets = [];
            if (prisma.ticket) {
                tickets = await prisma.ticket.findMany({
                    take: 25,
                    orderBy: { created_at: "desc" },
                });
            }

            return reply.send({
                items: tickets,
                total: tickets.length,
            });
        } catch (err) {
            // If table isn't migrated yet, return empty array instead of failing 500
            return reply.send({ items: [], total: 0 });
        }
    };

    // Note: Channel routes removed from here to prevent FST_ERR_DUPLICATED_ROUTE 
    // because they are registered via channelsRoutesMod in server.js.

    app.get("/tickets", { preHandler: requireAuth }, getTickets);
    app.get("/supportops/tickets", { preHandler: requireAuth }, getTickets);
}

export default supportopsRoutes;