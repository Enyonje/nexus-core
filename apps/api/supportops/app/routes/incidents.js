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

export default router;
