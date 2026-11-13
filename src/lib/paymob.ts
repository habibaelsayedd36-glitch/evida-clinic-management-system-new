import { createHmac, timingSafeEqual } from "node:crypto";

const HMAC_FIELDS = [
  "amount_cents",
  "created_at",
  "currency",
  "error_occured",
  "has_parent_transaction",
  "id",
  "integration_id",
  "is_3d_secure",
  "is_auth",
  "is_capture",
  "is_refunded",
  "is_standalone_payment",
  "is_voided",
  "order.id",
  "owner",
  "pending",
  "source_data.pan",
  "source_data.sub_type",
  "source_data.type",
  "success",
] as const;

function nestedValue(source: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((value, key) => {
    if (!value || typeof value !== "object") return undefined;
    return (value as Record<string, unknown>)[key];
  }, source);
}

export function verifyPaymobTransactionHmac(
  transaction: Record<string, unknown>,
  receivedHmac: string | null,
  secret: string,
): boolean {
  if (!receivedHmac || !/^[a-f0-9]{128}$/i.test(receivedHmac) || !secret) return false;
  const values = HMAC_FIELDS.map((field) => nestedValue(transaction, field));
  if (values.some((value) => value === undefined)) return false;
  const payload = values.map((value) => String(value)).join("");
  const calculated = createHmac("sha512", secret).update(payload).digest();
  const received = Buffer.from(receivedHmac, "hex");
  return received.length === calculated.length && timingSafeEqual(calculated, received);
}

export function paymobConfiguration() {
  const secretKey = process.env.PAYMOB_SECRET_KEY;
  const publicKey = process.env.PAYMOB_PUBLIC_KEY;
  const hmacSecret = process.env.PAYMOB_HMAC_SECRET;
  const integrationId = Number(process.env.PAYMOB_INTEGRATION_ID);
  const mode = process.env.PAYMOB_MODE ?? "test";

  if (!secretKey || !publicKey || !hmacSecret || !Number.isSafeInteger(integrationId) || integrationId <= 0) {
    throw new Error("Paymob is not configured. Add the Paymob environment variables in Vercel.");
  }
  if (mode !== "test" && mode !== "live") {
    throw new Error("PAYMOB_MODE must be test or live.");
  }

  return { secretKey, publicKey, hmacSecret, integrationId, mode };
}
