import { createHash, randomBytes } from "node:crypto";
import { and, eq, gte, isNull } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { db } from "@/db";
import { passwordResetTokens, profiles } from "@/db/schema";
import { fail, ok, readBody } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";
const genericMessage = "If an account exists for that email, a password reset link will be sent.";

export async function POST(req: NextRequest) {
  try {
    const body = await readBody(req);
    const email = String(body.email ?? "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail("Enter a valid email address.", 400);

    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM_EMAIL;
    if (!apiKey || !from) {
      console.error("[password reset] Email provider is not configured.");
      return fail("Password reset email is not configured yet. Please contact the clinic.", 503);
    }

    const [profile] = await db.select({ id: profiles.id, email: profiles.email, fullName: profiles.fullName })
      .from(profiles).where(eq(profiles.email, email)).limit(1);
    if (!profile) return ok({ message: genericMessage });

    const since = new Date(Date.now() - 15 * 60 * 1000);
    const recent = await db.select({ id: passwordResetTokens.id }).from(passwordResetTokens)
      .where(and(eq(passwordResetTokens.profileId, profile.id), gte(passwordResetTokens.createdAt, since)));
    if (recent.length >= 3) return ok({ message: genericMessage });

    await db.delete(passwordResetTokens)
      .where(and(eq(passwordResetTokens.profileId, profile.id), isNull(passwordResetTokens.usedAt)));

    const token = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    await db.insert(passwordResetTokens).values({
      profileId: profile.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    });

    const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin).replace(/\/$/, "");
    const resetUrl = baseUrl + "/reset-password?token=" + encodeURIComponent(token);
    const safeName = profile.fullName.replace(/[<>]/g, "");
    const html = '<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#292333"><h2 style="color:#5a3bb8">EVIDA Clinic</h2><p>Hello ' + safeName + ',</p><p>We received a request to reset your password. Use the secure link below. It expires in 30 minutes and can only be used once.</p><p><a href="' + resetUrl + '" style="display:inline-block;padding:13px 20px;background:#5a3bb8;color:#fff;text-decoration:none;border-radius:8px">Reset password</a></p><p>If you did not request this, you can ignore this email.</p></div>';
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [profile.email],
        subject: "Reset your EVIDA Clinic password",
        html,
        text: "Hello " + safeName + ", reset your EVIDA Clinic password using this link (expires in 30 minutes): " + resetUrl + ". If you did not request this, ignore this email.",
      }),
      cache: "no-store",
    });

    if (!emailResponse.ok) {
      await db.delete(passwordResetTokens).where(eq(passwordResetTokens.tokenHash, tokenHash));
      const detail = await emailResponse.text();
      console.error("[password reset] Resend error:", emailResponse.status, detail.slice(0, 500));
      return ok({ message: genericMessage });
    }

    return ok({ message: genericMessage });
  } catch (error) {
    console.error("[forgot password]", error);
    return fail("Unable to process your request right now.", 500);
  }
}
