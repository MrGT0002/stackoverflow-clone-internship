import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true, index: true },
    subscription: { type: mongoose.Schema.Types.ObjectId, ref: "subscription" },
    plan: { type: String, enum: ["bronze", "silver", "gold"], required: true },
    provider: { type: String, default: "razorpay" },
    orderId: String,
    subscriptionId: String,
    paymentId: { type: String, index: true },
    signature: String,
    amount: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    status: { type: String, enum: ["created", "authorized", "captured", "failed", "refunded"], default: "created", index: true },
    invoice: { type: mongoose.Schema.Types.ObjectId, ref: "invoice" },
    webhookEventId: { type: String, unique: true, sparse: true },
    metadata: { type: mongoose.Schema.Types.Mixed },
    paidAt: Date,
  },
  { timestamps: true }
);

export default mongoose.model("payment", paymentSchema);
