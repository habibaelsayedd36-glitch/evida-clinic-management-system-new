import type { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { verifyPassword } from "@/lib/crypto";
import { createSession } from "@/lib/session";
import { getDashboardPath, PROFILE_COLUMNS } from "@/lib/auth";
import { fail, ok, readBody } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await readBody(req);
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");

    if (!email || !password) return fail("Email and password are required", 400);

    const rows = await db
      .select({ id: profiles.id, passwordHash: profiles.passwordHash })
      .from(profiles)
      .where(eq(profiles.email, email))
      .limit(1);

    const row = rows[0];
    if (!row || !verifyPassword(password, row.passwordHash)) {
      return fail("Incorrect email or password", 401);
    }

    const [profile] = await db
      .select(PROFILE_COLUMNS)
      .from(profiles)
      .where(eq(profiles.id, row.id))
      .limit(1);

    if (!profile.isActive) return fail("This account is deactivated - contact clinic management", 403);

    await createSession(profile.id, profile.role);
    return ok({ user: profile, redirect: getDashboardPath(profile.role) });
  } catch (error) {
    console.error("[login]", error);
    return fail("Unable to sign in right now", 500);
  }
}
