import mongoose from "mongoose";

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, unique: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true, index: true },
    subscription: { type: mongoose.Schema.Types.ObjectId, ref: "subscription" },
    payment: { type: mongoose.Schema.Types.ObjectId, ref: "payment" },
    plan: { type: String, enum: ["bronze", "silver", "gold"], required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    billing: {
      name: String,
      email: String,
      phone: String,
      address: String,
      city: String,
      state: String,
      postalCode: String,
      country: String,
      gstin: String,
    },
    status: { type: String, enum: ["issued", "void"], default: "issued" },
    issuedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("invoice", invoiceSchema);
