import { and, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import {
  appointmentHistory,
  appointments,
  clientDoctors,
  dietMeals,
  dietPlans,
  doseLogs,
  medicalRecords,
  medicationDoses,
  notifications,
  profiles,
  treatmentPlans,
} from "@/db/schema";
import { hashPassword } from "./crypto";
import { AccessError, assert, canAccessClient, assertClientAccess, isAdmin } from "./acl";
import { bool, dateOnly, int, isUuid, num, str, timestamp } from "./api-helpers";
import type { ProfileDTO } from "./types";

type Body = Record<string, unknown>;

const fmtWhen = (value: Date) =>
  value.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });

export async function notify(
  recipients: (string | null | undefined)[],
  data: { title: string; body?: string | null; kind?: string; actorId?: string | null; clientId?: string | null },
) {
  const ids = [...new Set(recipients.filter((v): v is string => typeof v === "string" && v.length > 0))];
  if (!ids.length) return;
  await db.insert(notifications).values(
    ids.map((userId) => ({
      userId,
      title: data.title,
      body: data.body ?? null,
      kind: data.kind ?? "info",
      actorId: data.actorId ?? null,
      clientId: data.clientId ?? null,
    })),
  );
}

async function staffIds(role: "admin" | "doctor") {
  const rows = await db.select({ id: profiles.id }).from(profiles).where(eq(profiles.role, role));
  return rows.map((r) => r.id);
}

async function assignmentOf(clientId: string) {
  const rows = await db
    .select({ id: clientDoctors.id, clientId: clientDoctors.clientId, doctorId: clientDoctors.doctorId })
    .from(clientDoctors)
    .where(eq(clientDoctors.clientId, clientId))
    .limit(1);
  return rows[0] ?? null;
}

async function profileById(id: string) {
  const rows = await db
    .select({ id: profiles.id, fullName: profiles.fullName, email: profiles.email, role: profiles.role })
    .from(profiles)
    .where(eq(profiles.id, id))
    .limit(1);
  return rows[0] ?? null;
}

function requireUuid(value: unknown, label: string): string {
  if (!isUuid(value)) throw new AccessError(`${label} is not valid`, 400);
  return value;
}

/* ------------------------------------------------------------------ */
/* profiles                                                            */
/* ------------------------------------------------------------------ */

export async function createProfile(user: ProfileDTO, body: Body) {
  assert(isAdmin(user), "Only the admin can create accounts");
  const role = str(body.role, { label: "Role" }) ?? "client";
  assert(["admin", "doctor", "client"].includes(role), "Role must be admin, doctor or client");

  const email = str(body.email, { required: true, label: "Email", max: 160 })!.toLowerCase();
  const fullName = str(body.fullName, { required: true, label: "Full name", max: 120 })!;
  const password = String(body.password ?? "Evida@123");
  assert(password.length >= 8, "Password must be at least 8 characters");

  const duplicate = await db.select({ id: profiles.id }).from(profiles).where(eq(profiles.email, email)).limit(1);
  assert(duplicate.length === 0, "This email is already registered", 409);

  const [created] = await db
    .insert(profiles)
    .values({
      email,
      fullName,
      passwordHash: hashPassword(password),
      role,
      phone: str(body.phone, { label: "Phone number", max: 30 }),
      gender: str(body.gender, { max: 20 }),
      birthDate: dateOnly(body.birthDate),
      avatarHue: int(body.avatarHue) ?? 232 + Math.floor(Math.random() * 72),
      specialization: str(body.specialization, { max: 120 }),
      licenseNumber: str(body.licenseNumber, { max: 80 }),
      bio: str(body.bio, { max: 1000 }),
      heightCm: num(body.heightCm),
      weightKg: num(body.weightKg),
      targetWeightKg: num(body.targetWeightKg),
      bloodType: str(body.bloodType, { max: 10 }),
      allergies: str(body.allergies, { max: 500 }),
      medicalNotes: str(body.medicalNotes, { max: 3000 }),
      isActive: bool(body.isActive) ?? true,
    } as never)
    .returning({ id: profiles.id });

  const doctorId = isUuid(body.doctorId) ? body.doctorId : null;
  if (role === "client" && doctorId) {
    await upsertAssignment(user, { clientId: created.id, doctorId, note: str(body.assignmentNote) });
  }

  await notify([created.id], {
    title: "Welcome to EVIDA",
    body: "Your clinic account is active. You can follow your appointments, treatment plan and diet plan from here.",
    kind: "info",
    actorId: user.id,
    clientId: created.id,
  });

  return { id: created.id };
}

const SELF_EDITABLE = [
  "fullName",
  "phone",
  "gender",
  "birthDate",
  "heightCm",
  "weightKg",
  "targetWeightKg",
  "bloodType",
  "allergies",
] as const;

const DOCTOR_EDITABLE = [
  "heightCm",
  "weightKg",
  "targetWeightKg",
  "bloodType",
  "allergies",
  "medicalNotes",
] as const;

const ADMIN_EDITABLE = [
  ...SELF_EDITABLE,
  "medicalNotes",
  "email",
  "role",
  "isActive",
  "specialization",
  "licenseNumber",
  "bio",
  "avatarHue",
] as const;

function coerceField(key: string, value: unknown): unknown {
  switch (key) {
    case "isActive":
      return bool(value) ?? true;
    case "birthDate":
      return dateOnly(value);
    case "heightCm":
    case "weightKg":
    case "targetWeightKg":
      return num(value);
    case "avatarHue":
      return int(value) ?? 168;
    case "email":
      return str(value, { max: 160 })?.toLowerCase() ?? null;
    default:
      return str(value, { max: 3000 });
  }
}

export async function updateProfile(user: ProfileDTO, id: string, body: Body) {
  const targetId = id === "me" ? user.id : requireUuid(id, "User");
  const target = await profileById(targetId);
  assert(target, "Account not found", 404);

  const isSelf = targetId === user.id;
  let allowed: readonly string[];

  if (isAdmin(user)) {
    allowed = ADMIN_EDITABLE;
  } else if (isSelf) {
    allowed = target.role === "client" ? SELF_EDITABLE : ["fullName", "phone", "gender", "birthDate", "bio"];
  } else if (user.role === "doctor" && target.role === "client") {
    // is_assigned_doctor() — a doctor may only touch clinical fields of his own clients
    await assertClientAccess(user, targetId);
    allowed = DOCTOR_EDITABLE;
  } else {
    throw new AccessError("You are not allowed to edit this account");
  }

  const patch: Record<string, unknown> = {};
  for (const key of allowed) {
    if (body[key] !== undefined) patch[key] = coerceField(key, body[key]);
  }
  if (body.role !== undefined && !isAdmin(user)) {
    throw new AccessError("You are not allowed to change your role");
  }

  const newPassword = str(body.newPassword);
  if (newPassword) {
    assert(isSelf || isAdmin(user), "Only you or the admin can change this password");
    assert(newPassword.length >= 8, "New password must be at least 8 characters");
    patch.passwordHash = hashPassword(newPassword);
  }

  if (Object.keys(patch).length === 0) throw new AccessError("Nothing to update", 400);

  patch.updatedAt = new Date();
  await db.update(profiles).set(patch).where(eq(profiles.id, targetId));
  return { id: targetId };
}

export async function deleteProfile(user: ProfileDTO, id: string) {
  assert(isAdmin(user), "Only the admin can delete accounts");
  const targetId = requireUuid(id, "User");
  assert(targetId !== user.id, "You cannot delete your own account");
  const target = await profileById(targetId);
  assert(target, "Account not found", 404);
  await db.delete(profiles).where(eq(profiles.id, targetId));
  return { id: targetId };
}

/* ------------------------------------------------------------------ */
/* client_doctors                                                      */
/* ------------------------------------------------------------------ */

export async function upsertAssignment(user: ProfileDTO, body: Body) {
  assert(isAdmin(user), "Only the admin can link clients to doctors");
  const clientId = requireUuid(body.clientId, "Client");
  const doctorId = requireUuid(body.doctorId, "Doctor");
  const note = str(body.note, { max: 500 });

  const client = await profileById(clientId);
  assert(client && client.role === "client", "Client not found", 404);
  const doctor = await profileById(doctorId);
  assert(doctor && doctor.role === "doctor", "Doctor not found", 404);

  const existing = await assignmentOf(clientId);
  let rowId = existing?.id ?? null;
  if (existing) {
    await db.update(clientDoctors).set({ doctorId, note, assignedAt: new Date() }).where(eq(clientDoctors.id, existing.id));
  } else {
    const [created] = await db
      .insert(clientDoctors)
      .values({ clientId, doctorId, note })
      .returning({ id: clientDoctors.id });
    rowId = created.id;
  }

  await notify([clientId, doctorId], {
    title: existing ? "Responsible doctor changed" : "Linked to a responsible doctor",
    body: existing
      ? `${client.fullName} is now under the care of ${doctor.fullName}.`
      : `${doctor.fullName} is now responsible for ${client.fullName}.`,
    kind: "assignment",
    actorId: user.id,
    clientId,
  });

  return { id: rowId as string };
}

export async function updateAssignment(user: ProfileDTO, id: string, body: Body) {
  assert(isAdmin(user), "Only the admin can change assignments");
  const rowId = requireUuid(id, "Assignment");
  const patch: Record<string, unknown> = {};
  if (body.doctorId !== undefined) {
    const doctorId = requireUuid(body.doctorId, "Doctor");
    const doctor = await profileById(doctorId);
    assert(doctor && doctor.role === "doctor", "Doctor not found", 404);
    patch.doctorId = doctorId;
  }
  if (body.note !== undefined) patch.note = str(body.note, { max: 500 });
  assert(Object.keys(patch).length > 0, "Nothing to update", 400);
  await db.update(clientDoctors).set(patch).where(eq(clientDoctors.id, rowId));
  return { id: rowId };
}

export async function deleteAssignment(user: ProfileDTO, id: string) {
  assert(isAdmin(user), "Only the admin can remove assignments");
  const rowId = requireUuid(id, "Assignment");
  await db.delete(clientDoctors).where(eq(clientDoctors.id, rowId));
  return { id: rowId };
}

/* ------------------------------------------------------------------ */
/* appointments                                                        */
/* ------------------------------------------------------------------ */

export async function createAppointment(user: ProfileDTO, body: Body) {
  // a client booking for himself doesn't need to send clientId
  const clientId =
    user.role === "client" && !isUuid(body.clientId) ? user.id : requireUuid(body.clientId, "Client");
  await assertClientAccess(user, clientId);
  const assignment = await assignmentOf(clientId);

  let doctorId: string;
  if (user.role === "client") {
    assert(assignment, "The admin must link you to a doctor before you can book an appointment");
    doctorId = assignment.doctorId;
  } else if (user.role === "doctor") {
    doctorId = user.id;
    assert(assignment?.doctorId === user.id, "This client is not assigned to you");
  } else {
    doctorId = isUuid(body.doctorId) ? body.doctorId : (assignment?.doctorId ?? "");
    const doctor = await profileById(doctorId);
    assert(doctor && doctor.role === "doctor", "Please choose a valid doctor");
  }

  const scheduledAt = timestamp(body.scheduledAt, "Appointment time");
  const client = await profileById(clientId);

  const [row] = await db
    .insert(appointments)
    .values({
      clientId,
      doctorId,
      scheduledAt,
      durationMin: int(body.durationMin) ?? 30,
      kind: str(body.kind, { max: 40 }) ?? "consultation",
      status: user.role === "client" || user.role === "admin" ? "pending_doctor" : "scheduled",
      location: str(body.location, { max: 200 }) ?? "EVIDA Clinic — New Cairo, GOE Medical Park Mall 3",
      notes: str(body.notes, { max: 2000 }),
      price: user.role === "client" ? null : int(body.price),
      createdBy: user.id,
    })
    .returning({ id: appointments.id });

  await db.insert(appointmentHistory).values({
    appointmentId: row.id,
    clientId,
    doctorId,
    actorId: user.id,
    action: "created",
    detail: `${client?.fullName ?? "Client"} — ${fmtWhen(scheduledAt)}`,
  });

  const kindLabel = str(body.kind, { max: 40 }) ?? "consultation";
  if (user.role === "client" || user.role === "admin") {
    await notify(
      [doctorId, ...(await staffIds("admin")), ...(user.role === "admin" ? [clientId] : [])],
      {
        title: "New appointment awaiting doctor confirmation",
        body: user.role === "client"
          ? `${client?.fullName} requested an appointment for ${fmtWhen(scheduledAt)}.`
          : `An appointment was booked for ${client?.fullName} on ${fmtWhen(scheduledAt)} and needs your confirmation.`,
        kind: "appointment",
        actorId: user.id,
        clientId,
      },
    );
  } else {
    await notify([clientId], {
      title: "New appointment at EVIDA",
      body: `Your appointment is on ${fmtWhen(scheduledAt)} — ${kindLabel}.`,
      kind: "appointment",
      actorId: user.id,
      clientId,
    });
  }

  return { id: row.id };
}

export async function updateAppointment(user: ProfileDTO, id: string, body: Body) {
  const apptId = requireUuid(id, "Appointment");
  const rows = await db.select().from(appointments).where(eq(appointments.id, apptId)).limit(1);
  const appt = rows[0];
  assert(appt, "Appointment not found", 404);
  await assertClientAccess(user, appt.clientId);

  const patch: Record<string, unknown> = { updatedAt: new Date() };
  const requestedTime = body.scheduledAt !== undefined ? timestamp(body.scheduledAt, "Appointment time") : null;
  const timeChanged = requestedTime !== null && requestedTime.getTime() !== new Date(appt.scheduledAt).getTime();

  if (user.role === "client") {
    const status = str(body.status, { max: 30 });
    if (timeChanged) {
      assert(!["completed", "cancelled", "no_show"].includes(appt.status), "This appointment can no longer be rescheduled");
      patch.scheduledAt = requestedTime;
      patch.status = "pending_doctor";
    } else if (status === "scheduled") {
      assert(appt.status === "pending_client", "There is no proposed time waiting for your confirmation");
      patch.status = "scheduled";
    } else if (status === "cancelled") {
      patch.status = "cancelled";
    } else {
      throw new AccessError("Choose a different date and time to request a reschedule, or confirm the doctor's proposed time", 400);
    }
  } else {
    if (timeChanged) {
      patch.scheduledAt = requestedTime;
      patch.status = "pending_client";
    } else if (body.status !== undefined) {
      const nextStatus = str(body.status, { max: 30 }) ?? appt.status;
      if (nextStatus === "scheduled" && appt.status === "pending_doctor") {
        patch.status = "scheduled";
      } else if (["completed", "cancelled", "no_show"].includes(nextStatus)) {
        patch.status = nextStatus;
      } else {
        assert(nextStatus === appt.status, "Confirm the client's request or suggest a different date and time");
      }
    }
    if (body.durationMin !== undefined) patch.durationMin = int(body.durationMin) ?? 30;
    if (body.kind !== undefined) patch.kind = str(body.kind, { max: 40 }) ?? appt.kind;
    if (body.location !== undefined) patch.location = str(body.location, { max: 200 });
    if (body.notes !== undefined) patch.notes = str(body.notes, { max: 2000 });
    if (body.price !== undefined) patch.price = int(body.price);
    if (body.doctorId !== undefined && isAdmin(user)) {
      const doctorId = requireUuid(body.doctorId, "Doctor");
      const doctor = await profileById(doctorId);
      assert(doctor && doctor.role === "doctor", "Doctor not found", 404);
      patch.doctorId = doctorId;
    }
  }

  await db.update(appointments).set(patch).where(eq(appointments.id, apptId));

  const action = patch.status && patch.status !== appt.status ? String(patch.status) : timeChanged ? "reschedule_requested" : "updated";
  await db.insert(appointmentHistory).values({
    appointmentId: apptId,
    clientId: appt.clientId,
    doctorId: appt.doctorId,
    actorId: user.id,
    action,
    detail: patch.scheduledAt
      ? `Rescheduled to ${fmtWhen(patch.scheduledAt as Date)}`
      : action === "updated"
        ? "Appointment details updated"
        : `Status changed to ${action}`,
  });

  const recipients = user.role === "client" ? [appt.doctorId, ...(await staffIds("admin"))] : [appt.clientId];
  await notify(recipients, {
    title:
      action === "cancelled" ? "Appointment cancelled" :
      action === "pending_doctor" ? "Reschedule request from client" :
      action === "pending_client" ? "Doctor suggested a new appointment time" :
      action === "scheduled" ? "Appointment confirmed" : "Appointment updated",
    body:
      timeChanged
        ? `${user.role === "client" ? "Client requested" : "Doctor suggested"}: ${fmtWhen(requestedTime as Date)}. ${user.role === "client" ? "Please confirm or suggest another time." : "Please confirm this time or request another change."}`
        : action === "scheduled" ? "The appointment time has been confirmed." : `Appointment status is now: ${String(patch.status ?? appt.status)}`,
    kind: "appointment",
    actorId: user.id,
    clientId: appt.clientId,
  });

  return { id: apptId };
}

export async function deleteAppointment(user: ProfileDTO, id: string) {
  const apptId = requireUuid(id, "Appointment");
  const rows = await db.select().from(appointments).where(eq(appointments.id, apptId)).limit(1);
  const appt = rows[0];
  assert(appt, "Appointment not found", 404);
  const allowed = isAdmin(user) || (user.role === "doctor" && (await canAccessClient(user, appt.clientId)));
  assert(allowed, "You are not allowed to delete this appointment");

  await db.insert(appointmentHistory).values({
    appointmentId: null,
    clientId: appt.clientId,
    doctorId: appt.doctorId,
    actorId: user.id,
    action: "deleted",
    detail: `Deleted appointment of ${fmtWhen(appt.scheduledAt)}`,
  });
  await db.delete(appointments).where(eq(appointments.id, apptId));
  await notify([appt.clientId], {
    title: "Appointment removed",
    body: `Your appointment on ${fmtWhen(appt.scheduledAt)} was removed from the schedule.`,
    kind: "warning",
    actorId: user.id,
    clientId: appt.clientId,
  });
  return { id: apptId };
}

/* ------------------------------------------------------------------ */
/* clinical helpers                                                    */
/* ------------------------------------------------------------------ */

async function assertClinicalWriter(user: ProfileDTO, clientId: string) {
  assert(user.role !== "client", "Clients cannot add medical data");
  await assertClientAccess(user, clientId);
}

async function resolveDoctor(user: ProfileDTO, clientId: string, body: Body): Promise<string | null> {
  if (isAdmin(user) && isUuid(body.doctorId)) return body.doctorId;
  if (user.role === "doctor") return user.id;
  const assignment = await assignmentOf(clientId);
  return assignment?.doctorId ?? null;
}

export async function createRecord(user: ProfileDTO, body: Body) {
  const clientId = requireUuid(body.clientId, "Client");
  await assertClinicalWriter(user, clientId);
  const title = str(body.title, { required: true, label: "Record title", max: 200 })!;
  const [row] = await db
    .insert(medicalRecords)
    .values({
      clientId,
      doctorId: await resolveDoctor(user, clientId, body),
      title,
      visitDate: dateOnly(body.visitDate) ?? new Date().toISOString().slice(0, 10),
      diagnosis: str(body.diagnosis, { max: 2000 }),
      symptoms: str(body.symptoms, { max: 2000 }),
      bloodPressure: str(body.bloodPressure, { max: 20 }),
      heartRate: int(body.heartRate),
      temperature: num(body.temperature),
      weightKg: num(body.weightKg),
      notes: str(body.notes, { max: 4000 }),
    })
    .returning({ id: medicalRecords.id });

  await notify([clientId], {
    title: "New medical record",
    body: `A medical record was added: ${title}`,
    kind: "record",
    actorId: user.id,
    clientId,
  });
  return { id: row.id };
}

async function assertOwnsRow(
  table: typeof medicalRecords | typeof treatmentPlans | typeof medicationDoses | typeof dietPlans | typeof dietMeals,
  id: string,
) {
  const rows = await db
    .select({ clientId: (table as unknown as { clientId: never }).clientId })
    .from(table as never)
    .where(eq((table as unknown as { id: never }).id, id as never))
    .limit(1);
  const row = (rows as unknown as { clientId: string }[])[0];
  assert(row, "Record not found", 404);
  return row.clientId;
}

export async function createPlan(user: ProfileDTO, body: Body) {
  const clientId = requireUuid(body.clientId, "Client");
  await assertClinicalWriter(user, clientId);
  const title = str(body.title, { required: true, label: "Plan name", max: 200 })!;
  const [row] = await db
    .insert(treatmentPlans)
    .values({
      clientId,
      doctorId: await resolveDoctor(user, clientId, body),
      title,
      description: str(body.description, { max: 4000 }),
      startDate: dateOnly(body.startDate),
      endDate: dateOnly(body.endDate),
      status: str(body.status, { max: 30 }) ?? "active",
      sessionsTotal: int(body.sessionsTotal) ?? 0,
      sessionsDone: int(body.sessionsDone) ?? 0,
    })
    .returning({ id: treatmentPlans.id });
  await notify([clientId], {
    title: "New treatment plan",
    body: `${title} — you can follow the details in the Treatment section.`,
    kind: "plan",
    actorId: user.id,
    clientId,
  });
  return { id: row.id };
}

export async function createDose(user: ProfileDTO, body: Body) {
  const clientId = requireUuid(body.clientId, "Client");
  await assertClinicalWriter(user, clientId);
  const planId = isUuid(body.planId) ? body.planId : null;
  if (planId) {
    const plan = await db.select({ clientId: treatmentPlans.clientId }).from(treatmentPlans).where(eq(treatmentPlans.id, planId)).limit(1);
    assert(plan[0]?.clientId === clientId, "That plan does not belong to this client", 400);
  }
  const medicine = str(body.medicine, { required: true, label: "Medicine name", max: 200 })!;
  const frequency = str(body.frequency, { max: 120 });
  const [row] = await db
    .insert(medicationDoses)
    .values({
      planId,
      clientId,
      medicine,
      dosage: str(body.dosage, { max: 120 }),
      frequency,
      timeOfDay: str(body.timeOfDay, { max: 40 }),
      instructions: str(body.instructions, { max: 1000 }),
      startDate: dateOnly(body.startDate),
      endDate: dateOnly(body.endDate),
      active: bool(body.active) ?? true,
    })
    .returning({ id: medicationDoses.id });
  await notify([clientId], {
    title: "New dose added to your plan",
    body: `${medicine} — ${frequency ?? ""}`.trim(),
    kind: "medication",
    actorId: user.id,
    clientId,
  });
  return { id: row.id };
}

export async function createDietPlan(user: ProfileDTO, body: Body) {
  const clientId = requireUuid(body.clientId, "Client");
  await assertClinicalWriter(user, clientId);
  const title = str(body.title, { required: true, label: "Plan name", max: 200 })!;
  const [row] = await db
    .insert(dietPlans)
    .values({
      clientId,
      doctorId: await resolveDoctor(user, clientId, body),
      title,
      dailyCalories: int(body.dailyCalories),
      notes: str(body.notes, { max: 3000 }),
      startDate: dateOnly(body.startDate),
      endDate: dateOnly(body.endDate),
      status: str(body.status, { max: 30 }) ?? "active",
    })
    .returning({ id: dietPlans.id });
  await notify([clientId], {
    title: "New diet plan",
    body: `${title} — your meals are ready in the Diet section.`,
    kind: "diet",
    actorId: user.id,
    clientId,
  });
  return { id: row.id };
}

export async function createMeal(user: ProfileDTO, body: Body) {
  const dietPlanId = requireUuid(body.dietPlanId, "Diet plan");
  const plans = await db.select().from(dietPlans).where(eq(dietPlans.id, dietPlanId)).limit(1);
  const plan = plans[0];
  assert(plan, "Diet plan not found", 404);
  await assertClinicalWriter(user, plan.clientId);

  const [row] = await db
    .insert(dietMeals)
    .values({
      dietPlanId,
      clientId: plan.clientId,
      dayIndex: int(body.dayIndex) ?? 1,
      name: str(body.name, { required: true, label: "Meal name", max: 120 })!,
      timeOfDay: str(body.timeOfDay, { max: 40 }) ?? "breakfast",
      items: str(body.items, { max: 2000 }),
      calories: int(body.calories),
    })
    .returning({ id: dietMeals.id });
  return { id: row.id };
}

export async function createDoseLog(user: ProfileDTO, body: Body) {
  const doseId = requireUuid(body.doseId, "Dose");
  const rows = await db.select().from(medicationDoses).where(eq(medicationDoses.id, doseId)).limit(1);
  const dose = rows[0];
  assert(dose, "Dose not found", 404);
  await assertClientAccess(user, dose.clientId);

  const takenAt = body.takenAt ? timestamp(body.takenAt, "Dose time") : new Date();
  const [row] = await db
    .insert(doseLogs)
    .values({ doseId, clientId: dose.clientId, takenAt, note: str(body.note, { max: 500 }) })
    .returning({ id: doseLogs.id });

  if (user.role === "client") {
    const assignment = await assignmentOf(dose.clientId);
    if (assignment) {
      await notify([assignment.doctorId], {
        title: "Client logged a dose",
        body: `${dose.medicine} — ${fmtWhen(takenAt)}`,
        kind: "medication",
        actorId: user.id,
        clientId: dose.clientId,
      });
    }
  }

  return { id: row.id };
}

export async function sendNotification(user: ProfileDTO, body: Body) {
  assert(user.role !== "client", "Only staff can send notifications");
  const title = str(body.title, { required: true, label: "Notification title", max: 160 })!;
  const message = str(body.body, { max: 1000 });
  const kind = str(body.kind, { max: 30 }) ?? "info";
  const targetRole = str(body.targetRole, { max: 20 });
  const clientId = isUuid(body.clientId) ? body.clientId : null;
  const userId = isUuid(body.userId) ? body.userId : null;

  let recipients: string[] = [];
  if (userId) recipients = [userId];
  else if (clientId) {
    await assertClientAccess(user, clientId);
    recipients = [clientId];
  } else if (targetRole === "all-clients") {
    recipients =
      user.role === "admin"
        ? (await db.select({ id: profiles.id }).from(profiles).where(eq(profiles.role, "client"))).map((r) => r.id)
        : (
            await db
              .select({ clientId: clientDoctors.clientId })
              .from(clientDoctors)
              .where(eq(clientDoctors.doctorId, user.id))
          ).map((r) => r.clientId);
  } else if (targetRole === "all-doctors") {
    assert(isAdmin(user), "Broadcasting to all doctors is an admin action");
    recipients = await staffIds("doctor");
  } else {
    throw new AccessError("Please choose who should receive the notification", 400);
  }

  await notify(recipients, { title, body: message, kind, actorId: user.id, clientId });
  return { sent: recipients.length };
}

/* ------------------------------------------------------------------ */
/* generic update / delete for clinical rows                           */
/* ------------------------------------------------------------------ */

const TABLES = {
  "medical-records": { table: medicalRecords, label: "Medical record" },
  "treatment-plans": { table: treatmentPlans, label: "Treatment plan" },
  "medication-doses": { table: medicationDoses, label: "Dose" },
  "diet-plans": { table: dietPlans, label: "Diet plan" },
  "diet-meals": { table: dietMeals, label: "Meal" },
} as const;

export type ClinicalResource = keyof typeof TABLES;

export function isClinicalResource(resource: string): resource is ClinicalResource {
  return resource in TABLES;
}

const CLINICAL_FIELDS: Record<ClinicalResource, Record<string, (v: unknown) => unknown>> = {
  "medical-records": {
    title: (v) => str(v, { max: 200 }),
    visitDate: dateOnly,
    diagnosis: (v) => str(v, { max: 2000 }),
    symptoms: (v) => str(v, { max: 2000 }),
    bloodPressure: (v) => str(v, { max: 20 }),
    heartRate: int,
    temperature: num,
    weightKg: num,
    notes: (v) => str(v, { max: 4000 }),
  },
  "treatment-plans": {
    title: (v) => str(v, { max: 200 }),
    description: (v) => str(v, { max: 4000 }),
    startDate: dateOnly,
    endDate: dateOnly,
    status: (v) => str(v, { max: 30 }),
    sessionsTotal: int,
    sessionsDone: int,
  },
  "medication-doses": {
    medicine: (v) => str(v, { max: 200 }),
    dosage: (v) => str(v, { max: 120 }),
    frequency: (v) => str(v, { max: 120 }),
    timeOfDay: (v) => str(v, { max: 40 }),
    instructions: (v) => str(v, { max: 1000 }),
    startDate: dateOnly,
    endDate: dateOnly,
    active: (v) => bool(v) ?? true,
    planId: (v) => (isUuid(v) ? v : null),
  },
  "diet-plans": {
    title: (v) => str(v, { max: 200 }),
    dailyCalories: int,
    notes: (v) => str(v, { max: 3000 }),
    startDate: dateOnly,
    endDate: dateOnly,
    status: (v) => str(v, { max: 30 }),
  },
  "diet-meals": {
    name: (v) => str(v, { max: 120 }),
    timeOfDay: (v) => str(v, { max: 40 }),
    items: (v) => str(v, { max: 2000 }),
    calories: int,
    dayIndex: int,
  },
};

export async function updateClinical(user: ProfileDTO, resource: ClinicalResource, id: string, body: Body) {
  assert(user.role !== "client", "Only staff can edit medical data");
  const { table } = TABLES[resource];
  const rowId = requireUuid(id, TABLES[resource].label);
  const clientId = await assertOwnsRow(table, rowId);
  await assertClientAccess(user, clientId);

  const patch: Record<string, unknown> = {};
  for (const [key, coerce] of Object.entries(CLINICAL_FIELDS[resource])) {
    if (body[key] !== undefined) patch[key] = coerce(body[key]);
  }
  assert(Object.keys(patch).length > 0, "Nothing to update", 400);

  await db.update(table as never).set(patch as never).where(eq((table as unknown as { id: never }).id, rowId as never));

  if (resource === "treatment-plans" && patch.status && patch.status !== "active") {
    await notify([clientId], {
      title: "Treatment plan status changed",
      body: `New status: ${String(patch.status)}`,
      kind: "plan",
      actorId: user.id,
      clientId,
    });
  }
  return { id: rowId };
}

export async function deleteClinical(user: ProfileDTO, resource: ClinicalResource, id: string) {
  assert(user.role !== "client", "Only staff can delete medical data");
  const { table } = TABLES[resource];
  const rowId = requireUuid(id, TABLES[resource].label);
  const clientId = await assertOwnsRow(table, rowId);
  await assertClientAccess(user, clientId);
  await db.delete(table as never).where(eq((table as unknown as { id: never }).id, rowId as never));
  return { id: rowId };
}

export async function deleteDoseLog(user: ProfileDTO, id: string) {
  const rowId = requireUuid(id, "Log entry");
  const rows = await db.select().from(doseLogs).where(eq(doseLogs.id, rowId)).limit(1);
  const log = rows[0];
  assert(log, "Log entry not found", 404);
  await assertClientAccess(user, log.clientId);
  await db.delete(doseLogs).where(eq(doseLogs.id, rowId));
  return { id: rowId };
}

export async function markNotification(user: ProfileDTO, id: string, body: Body) {
  if (id === "all") {
    const unread = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(and(eq(notifications.userId, user.id), isNull(notifications.readAt)));
    const ids = unread.map((n) => n.id);
    if (ids.length) {
      await db.update(notifications).set({ readAt: new Date() }).where(inArray(notifications.id, ids));
    }
    return { marked: ids.length };
  }
  const rowId = requireUuid(id, "Notification");
  const rows = await db
    .select()
    .from(notifications)
    .where(and(eq(notifications.id, rowId), eq(notifications.userId, user.id)))
    .limit(1);
  assert(rows[0], "Notification not found", 404);
  const patch = body.read === false ? { readAt: null } : { readAt: new Date() };
  await db.update(notifications).set(patch).where(eq(notifications.id, rowId));
  return { id: rowId };
}

export async function deleteNotification(user: ProfileDTO, id: string) {
  const rowId = requireUuid(id, "Notification");
  await db.delete(notifications).where(and(eq(notifications.id, rowId), eq(notifications.userId, user.id)));
  return { id: rowId };
}
