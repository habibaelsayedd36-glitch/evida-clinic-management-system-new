import { createHash } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { db } from "@/db";
import { passwordResetTokens, profiles } from "@/db/schema";
import { hashPassword } from "@/lib/crypto";
import { fail, ok, readBody } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await readBody(req);
    const token = String(body.token ?? "");
    const password = String(body.password ?? "");
    if (!/^[a-f0-9]{64}$/i.test(token)) return fail("This reset link is invalid or has expired.", 400);
    if (password.length < 8) return fail("Password must be at least 8 characters.", 400);

    const tokenHash = createHash("sha256").update(token).digest("hex");
    const now = new Date();
    const [reset] = await db.select({ id: passwordResetTokens.id, profileId: passwordResetTokens.profileId })
      .from(passwordResetTokens)
      .where(and(
        eq(passwordResetTokens.tokenHash, tokenHash),
        isNull(passwordResetTokens.usedAt),
        gt(passwordResetTokens.expiresAt, now),
      )).limit(1);

    if (!reset) return fail("This reset link is invalid or has expired.", 400);

    const result = await db.transaction(async (tx) => {
      const [claimed] = await tx.update(passwordResetTokens)
        .set({ usedAt: now })
        .where(and(
          eq(passwordResetTokens.id, reset.id),
          isNull(passwordResetTokens.usedAt),
          gt(passwordResetTokens.expiresAt, now),
        ))
        .returning({ id: passwordResetTokens.id });
      if (!claimed) return false;

      await tx.update(profiles)
        .set({ passwordHash: hashPassword(password), updatedAt: now })
        .where(eq(profiles.id, reset.profileId));
      return true;
    });

    if (!result) return fail("This reset link has already been used or has expired.", 400);
    return ok({ message: "Your password has been reset. You can now sign in." });
  } catch (error) {
    console.error("[reset password]", error);
    return fail("Unable to reset your password right now.", 500);
  }
}
