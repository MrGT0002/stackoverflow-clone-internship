import crypto from "node:crypto";

const baseUrl = "https://api.razorpay.com/v1";

const getAuthHeader = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) throw new Error("Razorpay credentials are not configured");
  return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;
};

export const razorpayRequest = async (path, options = {}) => {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      Authorization: getAuthHeader(),
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.error?.description || data?.error?.reason || "Razorpay request failed";
    const error = new Error(message);
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
};

export const createRazorpaySubscription = async ({ planId, notes, customerNotify = true }) => {
  const totalCount = Number(process.env.RAZORPAY_SUBSCRIPTION_TOTAL_COUNT || 120);
  return razorpayRequest("/subscriptions", {
    method: "POST",
    body: JSON.stringify({
      plan_id: planId,
      total_count: totalCount,
      quantity: 1,
      customer_notify: customerNotify,
      notes,
    }),
  });
};

export const verifySubscriptionSignature = ({ paymentId, subscriptionId, signature }) => {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${paymentId}|${subscriptionId}`)
    .digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature || ""));
};

export const verifyWebhookSignature = (rawBody, signature) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
};

export const cancelRazorpaySubscription = async (subscriptionId, cancelAtCycleEnd = true) => {
  return razorpayRequest(`/subscriptions/${subscriptionId}/cancel`, {
    method: "POST",
    body: JSON.stringify({ cancel_at_cycle_end: cancelAtCycleEnd ? 1 : 0 }),
  });
};

export const getPlanIdForKey = (planKey) => {
  const envKey = `RAZORPAY_PLAN_${String(planKey).toUpperCase()}`;
  return process.env[envKey] || null;
};
