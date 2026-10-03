import express from "express";
import { getTickets } from "../controllers/ticketController.js";
import tenantContext from "../middleware/tenantContext.js";
import auth from "../middleware/auth.js";

const router = express.Router();

router.use(auth);
router.use(tenantContext);

router.get("/", getTickets);

export default router;
