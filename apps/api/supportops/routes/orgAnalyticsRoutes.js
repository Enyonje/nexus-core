/**
 * Organization Analytics Routes
 * Path: supportops/routes/orgAnalyticsRoutes.js
 */

import { getOrgAnalytics } from "../controllers/orgAnalyticsController.js";
import requireAuth from "../middleware/requireAuth.js";

export default async function orgAnalyticsRoutes(app) {
  // GET /api/v1/supportops/analytics/org
  app.get(
    "/org",
    { preHandler: requireAuth },
    async (req, reply) => {
      return getOrgAnalytics(req, reply);
    }
  );
}

// Named export for backward compatibility
export { orgAnalyticsRoutes };
