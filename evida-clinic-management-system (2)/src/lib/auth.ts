import { eq } from "drizzle-orm";
import { db } from "@/db";
import { profiles, type Role } from "@/db/schema";
import { readSessionToken } from "./session";
import { verifyToken } from "./crypto";
import type { ProfileDTO } from "./types";

export const PROFILE_COLUMNS = {
  id: profiles.id,
  email: profiles.email,
  fullName: profiles.fullName,
  role: profiles.role,
  phone: profiles.phone,
  gender: profiles.gender,
  birthDate: profiles.birthDate,
  avatarHue: profiles.avatarHue,
  isActive: profiles.isActive,
  specialization: profiles.specialization,
  licenseNumber: profiles.licenseNumber,
  bio: profiles.bio,
  heightCm: profiles.heightCm,
  weightKg: profiles.weightKg,
  targetWeightKg: profiles.targetWeightKg,
  bloodType: profiles.bloodType,
  allergies: profiles.allergies,
  medicalNotes: profiles.medicalNotes,
  createdAt: profiles.createdAt,
} as const;

/**
 * equivalent of Supabase `profiles` read policies:
 * own profile OR admin OR assigned doctor.
 */
export async function getCurrentProfile(): Promise<ProfileDTO | null> {
  const token = await readSessionToken();
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;

  const rows = await db
    .select(PROFILE_COLUMNS)
    .from(profiles)
    .where(eq(profiles.id, payload.uid))
    .limit(1);

  const row = rows[0];
  if (!row || !row.isActive) return null;
  return row as unknown as ProfileDTO;
}

export async function requireProfile(): Promise<ProfileDTO> {
  const me = await getCurrentProfile();
  if (!me) throw new AuthError("Please sign in first");
  return me;
}

export async function requireRole(...roles: Role[]): Promise<ProfileDTO> {
  const me = await requireProfile();
  if (!roles.includes(me.role)) {
    throw new AuthError("You do not have access to this page", 403);
  }
  return me;
}

export function getDashboardPath(role: string): string {
  if (role === "admin") return "/admin";
  if (role === "doctor") return "/doctor";
  return "/client";
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}
