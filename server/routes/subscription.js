import express from "express";
import auth from "../middleware/auth.js";
import { cancelSubscription, createSubscription, getMySubscription, getPlans, getQuestionUsage, verifySubscriptionPayment } from "../controller/subscription.js";

const router = express.Router();
router.get("/plans", getPlans);
router.get("/me", auth, getMySubscription);
router.get("/usage", auth, getQuestionUsage);
router.post("/create", auth, createSubscription);
router.post("/verify", auth, verifySubscriptionPayment);
router.patch("/:id/cancel", auth, cancelSubscription);
export default router;
