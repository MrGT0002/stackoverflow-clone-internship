import bcrypt from "bcryptjs";
import user from "../models/auth.js";
import passwordResetRequest from "../models/passwordResetRequest.js";
import {
  generateLetterOnlyPassword,
  isValidPhone,
  normalizePhone,
  sendPasswordByEmail,
  sendPasswordBySms,
} from "../services/passwordReset.js";

const getDateKey = (date = new Date()) => {
  const timeZone = process.env.RESET_RATE_LIMIT_TIMEZONE || "Asia/Kolkata";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
};

export const forgotPassword = async (req, res) => {
  const rawIdentifier = String(req.body?.identifier || "").trim();
  if (!rawIdentifier) {
    return res.status(400).json({ message: "Email address or phone number is required" });
  }

  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawIdentifier);
  const normalizedEmail = rawIdentifier.toLowerCase();
  const normalizedPhone = normalizePhone(rawIdentifier);

  if (!isEmail && !isValidPhone(normalizedPhone)) {
    return res.status(400).json({ message: "Enter a valid registered email address or phone number" });
  }

  try {
    const account = isEmail
      ? await user.findOne({ email: normalizedEmail })
      : await user.findOne({ phone: normalizedPhone });

    if (!account) {
      return res.status(404).json({ message: "No account was found with that email address or phone number" });
    }

    const dateKey = getDateKey();
    const channel = isEmail ? "email" : "phone";
    const generatedPassword = generateLetterOnlyPassword(12);
    const passwordHash = await bcrypt.hash(generatedPassword, 12);

    let resetRequest;
    try {
      resetRequest = await passwordResetRequest.create({
        user: account._id,
        dateKey,
        channel,
        passwordHash,
      });
    } catch (error) {
      if (error?.code === 11000) {
        return res.status(429).json({
          message: "You can use this option only one time per day.",
        });
      }
      throw error;
    }

    try {
      if (channel === "email") {
        await sendPasswordByEmail({
          to: account.email,
          name: account.name,
          password: generatedPassword,
        });
      } else {
        await sendPasswordBySms({
          to: account.phone,
          password: generatedPassword,
        });
      }
    } catch (deliveryError) {
      console.error("Forgot password delivery failed:", deliveryError);
      await passwordResetRequest.deleteOne({ _id: resetRequest._id }).catch(() => {});
      return res.status(503).json({
        message: deliveryError.message || "Unable to deliver the reset password right now",
      });
    }

    const updated = await user.findOneAndUpdate(
      { _id: account._id },
      {
        $set: {
          password: passwordHash,
          forgotPasswordLastRequestedAt: new Date(),
        },
      },
      { new: true }
    ).select("_id");

    if (!updated) {
      console.error("Forgot password: account disappeared before password update", account._id);
      return res.status(500).json({ message: "Unable to finish the password reset" });
    }

    await passwordResetRequest.updateOne(
      { _id: resetRequest._id },
      { $set: { deliveredAt: new Date(), completedAt: new Date() } }
    );

    return res.status(200).json({
      message: channel === "email"
        ? "A new temporary password has been sent to your registered email address."
        : "A new temporary password has been sent to your registered phone number.",
      channel,
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return res.status(500).json({ message: "Unable to process the password reset request" });
  }
};
