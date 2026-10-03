/**
 * AI Review Routes
 * Path: supportops/routes/aiReviewRoutes.js
 */

import express from "express";
import {
  listPending,
  reviewProposal
} from "../controllers/aiReviewController.js";

const router = express.Router();

router.get("/ai/pending", listPending);
router.post("/ai/review/:id", reviewProposal);

// Named export to satisfy: import { aiReviewRoutes } from "../supportops/routes/aiReviewRoutes.js"
export const aiReviewRoutes = router;

// Default export to satisfy: import aiReviewRoutes from "../supportops/routes/aiReviewRoutes.js"
export default router;