import crypto from "node:crypto";
import midtransClient from "midtrans-client";

const snap = new midtransClient.Snap({
  isProduction: process.env.MIDTRANS_IS_PRODUCTION === "true",
  serverKey: process.env.MIDTRANS_SERVER_KEY || "",
  clientKey: process.env.MIDTRANS_CLIENT_KEY || "",
});

export interface SnapChargeParams {
  orderId: string;
  grossAmount: number;
  customerDetails: {
    firstName: string;
    phone?: string;
  };
  itemDetails: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
  }>;
}

export interface SnapChargeResult {
  token: string;
  redirectUrl: string;
}

/**
 * Generate a unique order ID for Midtrans
 */
export function generateOrderId(studentNis: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 6);
  return `TUI-${studentNis}-${timestamp}-${random}`;
}

/**
 * Create a Snap transaction token
 */
export async function createSnapTransaction(
  params: SnapChargeParams,
): Promise<SnapChargeResult> {
  const { orderId, grossAmount, customerDetails, itemDetails } = params;

  const transactionParams = {
    transaction_details: {
      order_id: orderId,
      gross_amount: grossAmount,
    },
    customer_details: {
      first_name: customerDetails.firstName,
      phone: customerDetails.phone || "",
    },
    item_details: itemDetails,
    // Only allow bank transfer methods
    enabled_payments: [
      "bca_va",
      "bni_va",
      "bri_va",
      "echannel", // Mandiri
      "permata_va",
      "other_va",
    ],
    expiry: {
      start_time: new Date()
        .toISOString()
        .replace("T", " ")
        .replace(/\.\d+Z$/, " +0700"),
      unit: "hour",
      duration: 24,
    },
  };

  const response = await snap.createTransaction(transactionParams);

  return {
    token: response.token,
    redirectUrl: response.redirect_url,
  };
}

/**
 * Verify Midtrans webhook signature
 * SHA512(order_id + status_code + gross_amount + ServerKey)
 */
export function verifySignature(
  orderId: string,
  statusCode: string,
  grossAmount: string,
  signatureKey: string,
): boolean {
  const serverKey = process.env.MIDTRANS_SERVER_KEY || "";
  const payload = orderId + statusCode + grossAmount + serverKey;
  const expectedSignature = crypto
    .createHash("sha512")
    .update(payload)
    .digest("hex");
  return expectedSignature === signatureKey;
}

/**
 * Get transaction status from Midtrans (fallback to polling)
 */
export async function getTransactionStatus(
  orderId: string,
): Promise<Record<string, unknown>> {
  return snap.transaction.status(orderId);
}

/**
 * Cancel a pending transaction
 */
export async function cancelTransaction(
  orderId: string,
): Promise<Record<string, unknown>> {
  return snap.transaction.cancel(orderId);
}

/**
 * Get Midtrans client key for frontend Snap popup
 */
export function getClientKey(): string {
  return process.env.MIDTRANS_CLIENT_KEY || "";
}

/**
 * Get Snap JS URL based on environment
 */
export function getSnapJsUrl(): string {
  return process.env.MIDTRANS_IS_PRODUCTION === "true"
    ? "https://app.midtrans.com/snap/snap.js"
    : "https://app.sandbox.midtrans.com/snap/snap.js";
}
