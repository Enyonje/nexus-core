import express from "express";
import aiGuard from "../middleware/aiGuard.js";
import tenantContext from "../middleware/tenantContext.js";
import auth from "../middleware/auth.js";
import { runAIWorkflow } from "../controllers/aiController.js";

const router = express.Router();

router.use(auth);
router.use(tenantContext);
router.use(aiGuard);

router.post("/analyze", runAIWorkflow);

export default router;
