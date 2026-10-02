import mongoose from "mongoose";
import user from "../models/auth.js";
import subscription from "../models/subscription.js";
import payment from "../models/payment.js";
import invoice from "../models/invoice.js";
import question from "../models/question.js";
import { PAID_PLAN_KEYS, SUBSCRIPTION_PLANS, getPlan } from "../config_subscription.js";
import { cancelRazorpaySubscription, createRazorpaySubscription, getPlanIdForKey, verifySubscriptionSignature } from "../services/razorpay.js";
import { createInvoice } from "../services/invoice.js";

const getActiveSubscription = async (userId) => {
  const active = await subscription.findOne({
    user: userId,
    status: { $in: ["active", "authenticated", "pending"] },
    $or: [{ renewalDate: null }, { renewalDate: { $gte: new Date() } }],
  }).sort({ renewalDate: -1, createdAt: -1 });
  return active;
};

export const getPlans = async (req, res) => {
  res.status(200).json({ data: Object.values(SUBSCRIPTION_PLANS) });
};

export const getQuestionUsage = async (req, res) => {
  try {
    const plan = await getActiveSubscription(req.userid);
    const planConfig = getPlan(plan?.plan || "free");
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    const used = await question.countDocuments({ userid: String(req.userid), askedon: { $gte: start, $lt: end } });
    return res.status(200).json({ data: { plan: planConfig, used, limit: planConfig.dailyQuestionLimit, unlimited: planConfig.dailyQuestionLimit === null } });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to load question usage" });
  }
};

export const getMySubscription = async (req, res) => {
  try {
    const active = await getActiveSubscription(req.userid);
    const current = active || { plan: "free", status: "active", provider: "internal" };
    const payments = await payment.find({ user: req.userid }).sort({ createdAt: -1 }).limit(50).lean();
    const invoices = await invoice.find({ user: req.userid }).sort({ issuedAt: -1 }).limit(50).lean();
    res.status(200).json({ data: { subscription: current, payments, invoices, plan: getPlan(current.plan) } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to load subscription" });
  }
};

export const createSubscription = async (req, res) => {
  const planKey = String(req.body?.plan || "").toLowerCase();
  if (!PAID_PLAN_KEYS.includes(planKey)) return res.status(400).json({ message: "Invalid paid plan" });

  try {
    const existing = await getActiveSubscription(req.userid);
    if (existing?.plan === planKey) return res.status(409).json({ message: "You already have this active plan" });

    const planId = getPlanIdForKey(planKey);
    if (!planId) return res.status(503).json({ message: `Razorpay ${planKey} plan is not configured yet` });

    const currentUser = await user.findById(req.userid).select("name email").lean();
    if (!currentUser) return res.status(404).json({ message: "User not found" });

    const rpSubscription = await createRazorpaySubscription({
      planId,
      notes: { userId: String(req.userid), plan: planKey },
    });

    const localSubscription = await subscription.create({
      user: req.userid,
      plan: planKey,
      status: rpSubscription.status || "created",
      provider: "razorpay",
      providerSubscriptionId: rpSubscription.id,
      providerCustomerId: rpSubscription.customer_id,
      providerPlanId: planId,
      startDate: rpSubscription.start_at ? new Date(rpSubscription.start_at * 1000) : undefined,
      renewalDate: rpSubscription.current_end ? new Date(rpSubscription.current_end * 1000) : undefined,
      endDate: rpSubscription.end_at ? new Date(rpSubscription.end_at * 1000) : undefined,
      billing: { name: currentUser.name, email: currentUser.email },
    });

    await payment.create({
      user: req.userid,
      subscription: localSubscription._id,
      plan: planKey,
      provider: "razorpay",
      subscriptionId: rpSubscription.id,
      amount: getPlan(planKey).price * 100,
      currency: "INR",
      status: "created",
      metadata: { razorpayPlanId: planId },
    });

    res.status(201).json({
      data: {
        keyId: process.env.RAZORPAY_KEY_ID,
        subscriptionId: rpSubscription.id,
        plan: getPlan(planKey),
        user: { name: currentUser.name, email: currentUser.email },
      },
    });
  } catch (error) {
    console.error("Razorpay subscription error:", error);
    res.status(error.status || 500).json({ message: error.message || "Unable to create subscription" });
  }
};

export const verifySubscriptionPayment = async (req, res) => {
  const { razorpay_payment_id: paymentId, razorpay_subscription_id: subscriptionId, razorpay_signature: signature } = req.body || {};
  if (!paymentId || !subscriptionId || !signature) return res.status(400).json({ message: "Missing payment verification fields" });
  if (!verifySubscriptionSignature({ paymentId, subscriptionId, signature })) return res.status(400).json({ message: "Invalid payment signature" });

  try {
    const localSubscription = await subscription.findOne({ providerSubscriptionId: subscriptionId, user: req.userid });
    if (!localSubscription) return res.status(404).json({ message: "Subscription not found" });

    localSubscription.status = "authenticated";
    await localSubscription.save();

    const paymentDoc = await payment.findOneAndUpdate(
      { subscription: localSubscription._id, subscriptionId },
      { $set: { paymentId, signature, status: "authorized", paidAt: new Date() } },
      { new: true }
    );

    res.status(200).json({ message: "Payment verified", data: { subscription: localSubscription, payment: paymentDoc } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Payment verification failed" });
  }
};

export const cancelSubscription = async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: "Invalid subscription" });
  try {
    const local = await subscription.findOne({ _id: req.params.id, user: req.userid });
    if (!local) return res.status(404).json({ message: "Subscription not found" });
    if (local.provider !== "razorpay" || !local.providerSubscriptionId) return res.status(400).json({ message: "Subscription cannot be cancelled here" });
    await cancelRazorpaySubscription(local.providerSubscriptionId, true);
    local.cancelAtPeriodEnd = true;
    await local.save();
    res.status(200).json({ message: "Subscription will cancel at the end of the current billing cycle", data: local });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to cancel subscription" });
  }
};
