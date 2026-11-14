import { and, eq, inArray, isNull } from "drizzle-orm";
import { NextRequest } from "next/server";
import { db } from "@/db";
import { invoices, invoicePayments, paymobPaymentAttempts } from "@/db/schema";
import { paymobConfiguration, verifyPaymobTransactionHmac } from "@/lib/paymob";

export const dynamic = "force-dynamic";

type PaymobTransaction = Record<string, unknown> & {
  id?: number | string;
  amount_cents?: number;
  currency?: string;
  success?: boolean;
  pending?: boolean;
  error_occured?: boolean;
  is_refunded?: boolean;
  is_voided?: boolean;
  is_live?: boolean;
  integration_id?: number;
  order?: { id?: number | string };
};

export async function POST(request: NextRequest) {
  try {
    const config = paymobConfiguration();
    const payload = await request.json().catch(() => null) as { type?: string; obj?: PaymobTransaction } | null;
    const transaction = payload?.obj;
    if (payload?.type !== "TRANSACTION" || !transaction || typeof transaction !== "object") {
      return Response.json({ error: "Invalid Paymob callback." }, { status: 400 });
    }

    const signature = request.nextUrl.searchParams.get("hmac");
    if (!verifyPaymobTransactionHmac(transaction, signature, config.hmacSecret)) {
      return Response.json({ error: "Invalid callback signature." }, { status: 401 });
    }

    if (
      Number(transaction.integration_id) !== config.integrationId ||
      transaction.currency !== "EGP" ||
      Boolean(transaction.is_live) !== (config.mode === "live")
    ) {
      return Response.json({ error: "Payment configuration mismatch." }, { status: 400 });
    }

    const orderId = transaction.order?.id;
    const transactionId = transaction.id;
    if (orderId === undefined || transactionId === undefined) {
      return Response.json({ error: "Missing Paymob transaction identifiers." }, { status: 400 });
    }

    const [attempt] = await db.select().from(paymobPaymentAttempts)
      .where(eq(paymobPaymentAttempts.paymobOrderId, String(orderId))).limit(1);
    if (!attempt) return Response.json({ error: "Payment attempt not found." }, { status: 404 });

    if (attempt.status === "paid" || attempt.status === "review") {
      return Response.json({ received: true });
    }
    // A late successful callback may arrive after stale-attempt cleanup.
    if (attempt.status !== "pending" && attempt.status !== "failed") return Response.json({ received: true });

    const successful =
      transaction.success === true &&
      transaction.pending === false &&
      transaction.error_occured === false &&
      transaction.is_refunded !== true &&
      transaction.is_voided !== true &&
      Number(transaction.amount_cents) === attempt.amount * 100;

    if (!successful) {
      await db.update(paymobPaymentAttempts)
        .set({ status: "failed" })
        .where(and(eq(paymobPaymentAttempts.id, attempt.id), eq(paymobPaymentAttempts.status, "pending")));
      return Response.json({ received: true });
    }

    const outcome = await db.transaction(async (tx) => {
      const [current] = await tx.select().from(paymobPaymentAttempts)
        .where(eq(paymobPaymentAttempts.id, attempt.id)).limit(1);
      if (!current || (current.status !== "pending" && current.status !== "failed")) return current?.status ?? "missing";

      const [invoice] = await tx.select().from(invoices)
        .where(eq(invoices.id, current.invoiceId)).limit(1);
      if (!invoice) return "missing";

      const existingPayments = await tx.select({ amount: invoicePayments.amount })
        .from(invoicePayments).where(eq(invoicePayments.invoiceId, invoice.id));
      const alreadyPaid = existingPayments.reduce((sum, payment) => sum + payment.amount, 0);

      const newStatus = alreadyPaid + current.amount > invoice.totalAmount ? "review" : "paid";
      const [updated] = await tx.update(paymobPaymentAttempts)
        .set({
          status: newStatus,
          paymobTransactionId: String(transactionId),
          paidAt: new Date(),
        })
        .where(and(
          eq(paymobPaymentAttempts.id, current.id),
          inArray(paymobPaymentAttempts.status, ["pending", "failed"]),
          isNull(paymobPaymentAttempts.paymobTransactionId),
        ))
        .returning({ id: paymobPaymentAttempts.id });

      if (!updated) return "duplicate";

      if (newStatus === "paid") {
        await tx.insert(invoicePayments).values({
          invoiceId: invoice.id,
          amount: current.amount,
          method: "paymob",
          reference: String(transactionId),
          note: "Verified Paymob online payment",
          receivedBy: null,
        });
      }
      return newStatus;
    });

    if (outcome === "review") {
      console.error("[paymob] Successful gateway payment needs manual reconciliation because the invoice balance changed.", {
        invoiceId: attempt.invoiceId,
        transactionId: String(transactionId),
      });
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error("[paymob webhook]", error instanceof Error ? error.message : "Unknown error");
    return Response.json({ error: "Could not process Paymob callback." }, { status: 500 });
  }
}
