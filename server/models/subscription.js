import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true, index: true },
    plan: { type: String, enum: ["free", "bronze", "silver", "gold"], required: true },
    status: {
      type: String,
      enum: ["created", "authenticated", "active", "pending", "halted", "cancelled", "completed", "expired"],
      default: "created",
      index: true,
    },
    provider: { type: String, enum: ["internal", "razorpay"], default: "internal" },
    providerSubscriptionId: { type: String, unique: true, sparse: true, index: true },
    providerCustomerId: { type: String },
    providerPlanId: { type: String },
    startDate: { type: Date },
    renewalDate: { type: Date },
    endDate: { type: Date },
    cancelAtPeriodEnd: { type: Boolean, default: false },
    billing: {
      name: String,
      email: String,
      phone: String,
      address: String,
      city: String,
      state: String,
      postalCode: String,
      country: { type: String, default: "IN" },
      gstin: String,
    },
  },
  { timestamps: true }
);

subscriptionSchema.index({ user: 1, status: 1, renewalDate: -1 });

export default mongoose.model("subscription", subscriptionSchema);
