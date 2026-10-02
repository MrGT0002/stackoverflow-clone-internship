import subscription from "../models/subscription.js";
import question from "../models/question.js";
import { getPlan } from "../config_subscription.js";

const getCurrentPlan = async (userId) => {
  const active = await subscription.findOne({
    user: userId,
    status: "active",
    $or: [{ renewalDate: { $exists: false } }, { renewalDate: null }, { renewalDate: { $gte: new Date() } }],
  }).sort({ renewalDate: -1, createdAt: -1 });
  return getPlan(active?.plan || "free");
};

export const attachSubscription = async (req, res, next) => {
  try {
    req.currentPlan = await getCurrentPlan(req.userid);
    next();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unable to check subscription" });
  }
};

export const enforceQuestionLimit = async (req, res, next) => {
  try {
    const plan = req.currentPlan || await getCurrentPlan(req.userid);
    if (plan.dailyQuestionLimit === null) return next();
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    const count = await question.countDocuments({ userid: String(req.userid), askedon: { $gte: start, $lt: end } });
    if (count >= plan.dailyQuestionLimit) {
      return res.status(429).json({ message: `${plan.name} plan allows ${plan.dailyQuestionLimit} question${plan.dailyQuestionLimit === 1 ? "" : "s"} per day. Upgrade to continue.`, plan: plan.key, used: count, limit: plan.dailyQuestionLimit });
    }
    req.questionUsage = { used: count, limit: plan.dailyQuestionLimit, plan: plan.key };
    next();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unable to check question limit" });
  }
};
