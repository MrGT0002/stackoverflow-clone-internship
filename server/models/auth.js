import mongoose from "mongoose";

const userschema = mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, unique: true, sparse: true, trim: true },
  password: { type: String, required: true },
  forgotPasswordLastRequestedAt: { type: Date, default: null },
  about: { type: String },
  tags: { type: [String] },
  joinDate: { type: Date, default: Date.now },
});
export default mongoose.model("user", userschema);
