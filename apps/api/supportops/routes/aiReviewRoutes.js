/**
 * Human-in-the-Loop AI Review Routes
 * Path: supportops/routes/aiReviewRoutes.js
 */

import { listPending, reviewProposal } from "../controllers/aiReviewController.js";
import { guard } from "../security/entitlements.js";

export default async function aiReviewRoutes(app) {
  // Requires "supportops" app permissions with admin or management roles
  const access = guard({ app: "supportops", roles: ["admin", "management"] });

  // GET /api/v1/supportops/ai-review/pending
  app.get(
    "/pending",
    {
      preHandler: access,
    },
    async (req, reply) => {
      return listPending(req, reply);
    }
  );

  // POST /api/v1/supportops/ai-review/proposals/:id/review
  app.post(
    "/proposals/:id/review",
    {
      preHandler: access,
      schema: {
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "string" },
          },
        },
        body: {
          type: "object",
          required: ["decision"],
          properties: {
            decision: { type: "string", enum: ["approved", "rejected", "edited"] },
            finalReply: { type: "string" },
          },
        },
      },
    },
    async (req, reply) => {
      return reviewProposal(req, reply);
    }
  );
}

// Named export for backward compatibility across module loaders
export { aiReviewRoutes };