import { eq } from "drizzle-orm";
import { db } from "@/db";
import { clientDoctors } from "@/db/schema";
import type { ProfileDTO } from "./types";

export class AccessError extends Error {
  status: number;
  constructor(message: string, status = 403) {
    super(message);
    this.status = status;
  }
}

export function assert(
  condition: unknown,
  message = "You are not allowed to perform this action",
  status = 403,
): asserts condition {
  if (!condition) throw new AccessError(message, status);
}

export function isAdmin(user: ProfileDTO) {
  return user.role === "admin";
}

/** client ids the current user is allowed to see (null = unrestricted / admin). */
export async function visibleClientIds(user: ProfileDTO): Promise<string[] | null> {
  if (user.role === "admin") return null;
  if (user.role === "client") return [user.id];
  const rows = await db
    .select({ id: clientDoctors.clientId })
    .from(clientDoctors)
    .where(eq(clientDoctors.doctorId, user.id));
  return rows.map((r) => r.id);
}

/** the equivalent of is_assigned_doctor(client) */
export async function isAssignedDoctor(user: ProfileDTO, clientId: string): Promise<boolean> {
  if (user.role !== "doctor") return false;
  const rows = await db
    .select({ id: clientDoctors.id })
    .from(clientDoctors)
    .where(eq(clientDoctors.clientId, clientId))
    .limit(1);
  const assignment = rows[0];
  if (!assignment) return false;
  const link = await db
    .select({ doctorId: clientDoctors.doctorId })
    .from(clientDoctors)
    .where(eq(clientDoctors.clientId, clientId))
    .limit(1);
  return link[0]?.doctorId === user.id;
}

/** the equivalent of can_access_client(client) */
export async function canAccessClient(user: ProfileDTO, clientId: string): Promise<boolean> {
  if (isAdmin(user)) return true;
  if (user.role === "client") return user.id === clientId;
  return isAssignedDoctor(user, clientId);
}

export async function assertClientAccess(user: ProfileDTO, clientId: string) {
  const ok = await canAccessClient(user, clientId);
  assert(ok, "This client is not assigned to you — access denied");
}
