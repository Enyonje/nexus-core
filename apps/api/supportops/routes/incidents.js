/**
 * Incident Management Routes
 * Path: supportops/routes/incidents.js
 */

import express from "express";
import auth from "../middleware/auth.js";
import tenantContext from "../middleware/tenantContext.js";
import {
  createIncident,
  listIncidents,
  updateIncident
} from "../controllers/incidentController.js";

const router = express.Router();

router.use(auth);
router.use(tenantContext);

router.get("/", listIncidents);
router.post("/", createIncident);
router.patch("/:id", updateIncident);

// Named export to satisfy: import { incidentsRoutes } from "../supportops/routes/incidents.js"
export const incidentsRoutes = router;

// Default export to satisfy: import incidentsRoutes from "../supportops/routes/incidents.js"
export default router;