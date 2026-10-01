/**
 * Organization Analytics Routes
 * Path: supportops/routes/orgAnalyticsRoutes.js
 */

import express from "express";
import { getOrgAnalytics } from "../controllers/orgAnalyticsController.js";
import requireAuth from "../middleware/requireAuth.js";

const router = express.Router();

router.get(
  "/org/analytics",
  requireAuth,
  getOrgAnalytics
);

// Named export to satisfy: import { orgAnalyticsRoutes } from "../supportops/routes/orgAnalyticsRoutes.js"
export const orgAnalyticsRoutes = router;

// Default export to satisfy: import orgAnalyticsRoutes from "../supportops/routes/orgAnalyticsRoutes.js"
export default router;