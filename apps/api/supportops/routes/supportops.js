// src/routes/supportops.js
import { requireAuth } from "./security/authMiddleware.js";

export async function supportopsRoutes(app) {
    // Base SupportOps status route only. 
    // Ticket routes are fully managed by ticketsRoutes.js to prevent duplication.
    app.get("/", { preHandler: requireAuth }, async (req, reply) => {
        return reply.send({ status: "SupportOps module operational", version: "1.0.0" });
    });
}

export default supportopsRoutes;