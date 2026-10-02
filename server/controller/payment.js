import subscription from "../models/subscription.js";
import payment from "../models/payment.js";
import { verifyWebhookSignature } from "../services/razorpay.js";
import { createInvoice } from "../services/invoice.js";

const toDate = (unix) => (unix ? new Date(Number(unix) * 1000) : undefined);

const syncSubscriptionFromPayload = async (entity) => {
  if (!entity?.id) return null;
  const local = await subscription.findOne({ providerSubscriptionId: entity.id });
  if (!local) return null;
  local.status = entity.status || local.status;
  local.providerCustomerId = entity.customer_id || local.providerCustomerId;
  if (entity.status === "active") {
    await subscription.updateMany(
      { user: local.user, _id: { $ne: local._id }, status: "active" },
      { $set: { status: "completed" } }
    );
  }
  local.startDate = toDate(entity.current_start) || toDate(entity.start_at) || local.startDate;
  local.renewalDate = toDate(entity.current_end) || toDate(entity.charge_at) || local.renewalDate;
  local.endDate = toDate(entity.end_at) || local.endDate;
  if (entity.status === "cancelled" || entity.status === "completed" || entity.status === "expired") local.cancelAtPeriodEnd = false;
  await local.save();
  return local;
};

export const razorpayWebhook = async (req, res) => {
  const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body || "");
  const signature = req.get("X-Razorpay-Signature");
  if (!verifyWebhookSignature(rawBody, signature)) return res.status(400).json({ message: "Invalid webhook signature" });

  let event;
  try { event = JSON.parse(rawBody.toString("utf8")); } catch { return res.status(400).json({ message: "Invalid webhook body" }); }

  const eventId = req.get("x-razorpay-event-id") || event.id;
  try {
    if (eventId) {
      const duplicate = await payment.exists({ webhookEventId: eventId });
      if (duplicate) return res.status(200).json({ received: true, duplicate: true });
    }

    const entity = event?.payload?.subscription?.entity;
    const paymentEntity = event?.payload?.payment?.entity;
    const localSubscription = await syncSubscriptionFromPayload(entity);

    if (localSubscription && ["subscription.authenticated", "subscription.activated", "subscription.charged"].includes(event.event)) {
      const amount = Number(paymentEntity?.amount || 0);
      let paymentDoc = null;
      if (paymentEntity?.id && amount > 0) {
        paymentDoc = await payment.findOne({ subscriptionId: localSubscription.providerSubscriptionId, paymentId: paymentEntity.id });
        if (!paymentDoc) {
          paymentDoc = await payment.create({
            user: localSubscription.user,
            subscription: localSubscription._id,
            plan: localSubscription.plan,
            provider: "razorpay",
            subscriptionId: localSubscription.providerSubscriptionId,
            paymentId: paymentEntity.id,
            amount,
            currency: paymentEntity.currency || "INR",
            status: paymentEntity.status === "captured" ? "captured" : "authorized",
            webhookEventId: eventId,
            paidAt: new Date(),
            metadata: { event: event.event },
          });
        } else if (eventId) {
          paymentDoc.webhookEventId = eventId;
          await paymentDoc.save();
        }
      }

      if (event.event === "subscription.charged" && paymentDoc && !paymentDoc.invoice) {
        const planAmount = amount || paymentDoc.amount;
        if (planAmount) {
          const invoice = await createInvoice({
            userId: localSubscription.user,
            subscriptionId: localSubscription._id,
            paymentId: paymentDoc._id,
            plan: localSubscription.plan,
            amount: planAmount / 100,
            billing: localSubscription.billing,
          });
          paymentDoc.invoice = invoice._id;
          await paymentDoc.save();
        }
      }
    }

    if (eventId && !localSubscription && paymentEntity?.id) {
      await payment.findOneAndUpdate({ paymentId: paymentEntity.id }, { $set: { webhookEventId: eventId } });
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("Razorpay webhook error:", error);
    return res.status(500).json({ message: "Webhook processing failed" });
  }
};
