import crypto from "node:crypto";
import nodemailer from "nodemailer";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

export const generateLetterOnlyPassword = (length = 12) => {
  const size = Math.max(8, Number(length) || 12);
  let password = "";
  for (let i = 0; i < size; i += 1) {
    password += LETTERS[crypto.randomInt(0, LETTERS.length)];
  }
  return password;
};

export const normalizePhone = (phone = "") => {
  const value = String(phone).trim().replace(/[\s()-]/g, "");
  if (!value) return "";
  if (value.startsWith("+")) return `+${value.slice(1).replace(/\D/g, "")}`;
  return value.replace(/\D/g, "");
};

export const isValidPhone = (phone) => /^\+?[1-9]\d{7,14}$/.test(phone);

const createMailTransport = () => {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    throw new Error("Email reset is not configured. Set SMTP_HOST, SMTP_USER and SMTP_PASS.");
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT || 587),
    secure: String(SMTP_PORT || "587") === "465",
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
};

export const sendPasswordByEmail = async ({ to, name, password }) => {
  const transport = createMailTransport();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  await transport.sendMail({
    from,
    to,
    subject: "Your new Stack Overflow password",
    text: `Hello ${name || "there"},\n\nA password reset was requested for your account. Your new temporary password is:\n\n${password}\n\nUse this temporary password to sign in to your account.\n\nIf you did not request this, contact support immediately.`,
    html: `<p>Hello ${name || "there"},</p><p>A password reset was requested for your account.</p><p>Your new temporary password is:</p><p><strong style="font-size:20px;letter-spacing:2px">${password}</strong></p><p>Use this temporary password to sign in to your account.</p><p>If you did not request this, contact support immediately.</p>`,
  });
};

export const sendPasswordBySms = async ({ to, password }) => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!accountSid || !authToken || !from) {
    throw new Error("SMS reset is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_FROM_NUMBER.");
  }

  const body = new URLSearchParams({
    To: to,
    From: from,
    Body: `Your new temporary Stack Overflow password is: ${password}. Change it after logging in. If you didn't request this, contact support.`,
  });

  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data?.message || "SMS delivery failed");
  }
};
