import mongoose from "mongoose";

const passwordResetRequestSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
  dateKey: { type: String, required: true },
  channel: { type: String, enum: ["email", "phone"], required: true },
  passwordHash: { type: String, required: true },
  requestedAt: { type: Date, default: Date.now },
  deliveredAt: { type: Date, default: null },
  completedAt: { type: Date, default: null },
}, { timestamps: true });

passwordResetRequestSchema.index({ user: 1, dateKey: 1 }, { unique: true });
passwordResetRequestSchema.index({ requestedAt: 1 }, { expireAfterSeconds: 172800 });

export default mongoose.model("passwordResetRequest", passwordResetRequestSchema);
