import express from "express";
import {
  listPending,
  reviewProposal
} from "../controllers/aiReviewController.js";

const router = express.Router();

router.get("/ai/pending", listPending);
router.post("/ai/review/:id", reviewProposal);

export default router;
