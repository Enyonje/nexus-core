import express from "express";
import { getOrgAnalytics } from "../controllers/orgAnalyticsController.js";
import requireAuth from "../middleware/requireAuth.js";

const router = express.Router();

router.get(
  "/org/analytics",
  requireAuth,
  getOrgAnalytics
);

export default router;
