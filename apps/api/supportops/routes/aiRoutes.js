/**
 * AI Processing Routes
 * Path: supportops/routes/aiRoutes.js
 */

import express from "express";
import { runAIOnTicket } from "../controllers/aiController.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

router.post("/tickets/:ticketId/ai-run", authMiddleware, runAIOnTicket);

// Named export to satisfy: import { aiRoutes } from "../supportops/routes/aiRoutes.js"
export const aiRoutes = router;

// Default export to satisfy: import aiRoutes from "../supportops/routes/aiRoutes.js"
export default router;