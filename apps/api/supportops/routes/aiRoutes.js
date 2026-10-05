/**
 * AI Processing Routes
 * Path: supportops/routes/aiRoutes.js
 */

import { runAIOnTicket } from "../controllers/aiController.js";
import { guard } from "../security/entitlements.js";

export default async function aiRoutes(app) {
    const access = guard({ app: "supportops" });

    // Handles POST /api/v1/supportops/ai-agent/:ticketId/ai-run
    app.post(
        "/:ticketId/ai-run",
        {
            preHandler: access,
            schema: {
                params: {
                    type: "object",
                    required: ["ticketId"],
                    properties: {
                        ticketId: { type: "string" },
                    },
                },
            },
        },
        async (req, reply) => {
            // Forward Fastify request/reply objects to the controller
            return runAIOnTicket(req, reply);
        }
    );
}

// Named export for backward compatibility across imports
export { aiRoutes };