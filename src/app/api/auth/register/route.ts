import type { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { clientDoctors, notifications, profiles } from "@/db/schema";
import { hashPassword } from "@/lib/crypto";
import { createSession } from "@/lib/session";
import { PROFILE_COLUMNS } from "@/lib/auth";
import { fail, ok, readBody, str, num, dateOnly } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

/** Self registration is always as a `client` — staff accounts are created by the admin. */
export async function POST(req: NextRequest) {
  try {
    const body = await readBody(req);
    const fullName = str(body.fullName, { required: true, label: "Full name", max: 120 });
    const email = str(body.email, { required: true, label: "Email", max: 160 })?.toLowerCase();
    const password = String(body.password ?? "");
    const phone = str(body.phone, { label: "Phone number", max: 30 });

    if (!fullName || !email) return fail("Name and email are required", 400);
    if (password.length < 8) return fail("Password must be at least 8 characters", 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail("Invalid email address", 400);

    const existing = await db
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.email, email))
      .limit(1);
    if (existing.length) return fail("This email is already registered", 409);

    const [created] = await db
      .insert(profiles)
      .values({
        fullName,
        email,
        phone,
        passwordHash: hashPassword(password),
        role: "client",
        gender: str(body.gender, { max: 20 }),
        birthDate: dateOnly(body.birthDate),
        heightCm: num(body.heightCm),
        weightKg: num(body.weightKg),
        targetWeightKg: num(body.targetWeightKg),
        bloodType: str(body.bloodType, { max: 10 }),
        allergies: str(body.allergies, { max: 500 }),
        medicalNotes: str(body.medicalNotes, { max: 2000 }),
        avatarHue: 232 + Math.floor(Math.random() * 72),
      })
      .returning({ id: profiles.id });

    // tell the admin there is a new client waiting to be assigned to a doctor
    const admins = await db
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.role, "admin"));
    if (admins.length) {
      await db.insert(notifications).values(
        admins.map((admin) => ({
          userId: admin.id,
          clientId: created.id,
          title: "New client registered",
          body: `${fullName} (${email}) needs to be assigned to a responsible doctor.`,
          kind: "warning",
        })),
      );
    }

    const [profile] = await db
      .select(PROFILE_COLUMNS)
      .from(profiles)
      .where(eq(profiles.id, created.id))
      .limit(1);

    await createSession(profile.id, profile.role);
    return ok({ user: profile, redirect: "/client", assigned: false as boolean, count: (await db.select({ id: clientDoctors.id }).from(clientDoctors).where(eq(clientDoctors.clientId, created.id))).length });
  } catch (error) {
    console.error("[register]", error);
    return fail("Unable to complete registration right now", 500);
  }
}
