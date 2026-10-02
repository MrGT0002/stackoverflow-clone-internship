import crypto from "node:crypto";
import invoice from "../models/invoice.js";

const createInvoiceNumber = () => {
  const suffix = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `CQ-${new Date().getFullYear()}-${suffix}`;
};

export const createInvoice = async ({ userId, subscriptionId, paymentId, plan, amount, billing }) => {
  return invoice.create({
    invoiceNumber: createInvoiceNumber(),
    user: userId,
    subscription: subscriptionId,
    payment: paymentId,
    plan,
    amount,
    currency: "INR",
    billing,
  });
};
