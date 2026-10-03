import express from "express";
import { runAIOnTicket } from "../controllers/aiController.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

router.post("/tickets/:ticketId/ai-run", authMiddleware, runAIOnTicket);

export default router;
