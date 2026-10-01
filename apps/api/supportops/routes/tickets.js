/**
 * Tickets Routes
 * Path: supportops/routes/tickets.js
 */

import express from "express";
import { getTickets } from "../controllers/ticketController.js";
import tenantContext from "../middleware/tenantContext.js";
import auth from "../middleware/auth.js";

const router = express.Router();

router.use(auth);
router.use(tenantContext);

router.get("/", getTickets);

// Named exports to satisfy:
// import { ticketsRoutes } from "..." OR import { ticketRoutes } from "..."
export const ticketsRoutes = router;
export const ticketRoutes = router;

// Default export
export default router;