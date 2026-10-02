import express from "express";
import { razorpayWebhook } from "../controller/payment.js";
const router = express.Router();
router.post("/webhook", razorpayWebhook);
export default router;
