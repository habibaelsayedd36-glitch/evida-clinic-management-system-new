import { and, eq, lt } from "drizzle-orm";
import { NextRequest } from "next/server";
import { db } from "@/db";
import { invoices, invoicePayments, paymobPaymentAttempts, profiles } from "@/db/schema";
import { requireProfile } from "@/lib/auth";
import { paymobConfiguration } from "@/lib/paymob";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const user = await requireProfile();
    if (user.role !== "client") return Response.json({ error: "Only clients can pay their own invoices." }, { status: 403 });

    const body = await request.json().catch(() => ({}));
    const invoiceId = typeof body.invoiceId === "string" ? body.invoiceId : "";
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(invoiceId)) {
      return Response.json({ error: "Invalid invoice." }, { status: 400 });
    }

    const [invoice] = await db.select().from(invoices)
      .where(and(eq(invoices.id, invoiceId), eq(invoices.clientId, user.id))).limit(1);
    if (!invoice) return Response.json({ error: "Invoice not found." }, { status: 404 });

    const paymentRows = await db.select({ amount: invoicePayments.amount })
      .from(invoicePayments).where(eq(invoicePayments.invoiceId, invoiceId));
    const paidAmount = paymentRows.reduce((sum, payment) => sum + payment.amount, 0);
    const remaining = invoice.totalAmount - paidAmount;
    if (remaining <= 0) return Response.json({ error: "This invoice is already paid." }, { status: 409 });

    // Paymob intentions expire after 30 minutes. Keep a 15-minute grace period
    // for delayed callbacks before allowing a replacement attempt.
    const staleBefore = new Date(Date.now() - 45 * 60 * 1000);
    await db.update(paymobPaymentAttempts)
      .set({ status: "failed" })
      .where(and(
        eq(paymobPaymentAttempts.invoiceId, invoiceId),
        eq(paymobPaymentAttempts.status, "pending"),
        lt(paymobPaymentAttempts.createdAt, staleBefore),
      ));

    const pending = await db.select({ id: paymobPaymentAttempts.id })
      .from(paymobPaymentAttempts)
      .where(and(eq(paymobPaymentAttempts.invoiceId, invoiceId), eq(paymobPaymentAttempts.status, "pending")))
      .limit(1);
    if (pending.length) return Response.json({ error: "A payment attempt is already in progress. Refresh your invoices in a moment." }, { status: 409 });

    if (!user.phone) return Response.json({ error: "Please add your phone number to your profile before paying online." }, { status: 400 });

    const config = paymobConfiguration();
    const [profile] = await db.select({ fullName: profiles.fullName, email: profiles.email, phone: profiles.phone })
      .from(profiles).where(eq(profiles.id, user.id)).limit(1);
    if (!profile?.phone) return Response.json({ error: "Please add your phone number to your profile before paying online." }, { status: 400 });

    const attemptId = crypto.randomUUID();
    await db.insert(paymobPaymentAttempts).values({ id: attemptId, invoiceId, amount: remaining, status: "pending" });

    const nameParts = (profile.fullName || "EVIDA Client").trim().split(/\s+/);
    const firstName = nameParts[0] || "Client";
    const lastName = nameParts.slice(1).join(" ") || "EVIDA";
    const phone = profile.phone.startsWith("+") ? profile.phone : profile.phone.startsWith("0") ? `+2${profile.phone}` : `+20${profile.phone}`;
    const origin = request.nextUrl.origin;

    const paymobResponse = await fetch("https://accept.paymob.com/v1/intention/", {
      method: "POST",
      headers: {
        Authorization: `Token ${config.secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: remaining * 100,
        currency: "EGP",
        payment_methods: [config.integrationId],
        items: [{
          name: `EVIDA invoice ${invoice.invoiceNumber}`,
          amount: remaining * 100,
          description: "EVIDA Clinic invoice payment",
          quantity: 1,
        }],
        billing_data: {
          first_name: firstName,
          last_name: lastName,
          phone_number: phone,
          email: profile.email,
          street: "N/A",
          building: "1",
          floor: "1",
          apartment: "1",
          city: "Cairo",
          country: "EGY",
          state: "Cairo",
        },
        special_reference: attemptId,
        extras: { invoice_id: invoiceId, invoice_number: invoice.invoiceNumber },
        expiration: 1800,
        notification_url: `${origin}/api/payments/paymob/webhook`,
        redirection_url: `${origin}/client?payment=return`,
      }),
      cache: "no-store",
    });

    const result = await paymobResponse.json().catch(() => ({})) as {
      client_secret?: string;
      intention_order_id?: number | string;
      detail?: string;
      message?: string;
    };

    if (!paymobResponse.ok || !result.client_secret || !result.intention_order_id) {
      await db.update(paymobPaymentAttempts).set({ status: "failed" }).where(eq(paymobPaymentAttempts.id, attemptId));
      console.error("[paymob] Intention creation failed:", paymobResponse.status, result.detail ?? result.message ?? "Unknown error");
      return Response.json({ error: "Paymob could not start the payment. Please try again or contact the clinic." }, { status: 502 });
    }

    await db.update(paymobPaymentAttempts)
      .set({ paymobOrderId: String(result.intention_order_id) })
      .where(eq(paymobPaymentAttempts.id, attemptId));

    const checkout = new URL("https://accept.paymob.com/unifiedcheckout/");
    checkout.searchParams.set("publicKey", config.publicKey);
    checkout.searchParams.set("clientSecret", result.client_secret);

    return Response.json({ checkoutUrl: checkout.toString() });
  } catch (error) {
    console.error("[paymob checkout]", error instanceof Error ? error.message : "Unknown error");
    const message = error instanceof Error && error.message.includes("Paymob is not configured")
      ? error.message
      : "Could not start the payment. Please try again.";
    return Response.json({ error: message }, { status: 500 });
  }
}
