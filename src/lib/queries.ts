import { and, asc, desc, eq, inArray, or, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
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
import { PROFILE_COLUMNS } from "./auth";
import { visibleClientIds } from "./acl";
import type {
  AppointmentDTO,
  AssignmentDTO,
  Bootstrap,
  DietPlanDTO,
  DoseDTO,
  DoseLogDTO,
  HistoryDTO,
  MealDTO,
  NotificationDTO,
  PlanDTO,
  ProfileDTO,
  RecordDTO,
  Stats,
} from "./types";

const clientP = alias(profiles, "profiles_client");
const doctorP = alias(profiles, "profiles_doctor");
const actorP = alias(profiles, "profiles_actor");
const dosePlan = alias(treatmentPlans, "treatment_plans_of_dose");
const mealPlan = alias(dietPlans, "diet_plans_of_meal");

const iso = (value: Date | string | null | undefined): string =>
  value instanceof Date ? value.toISOString() : (value ?? new Date().toISOString());

type Scope = { ids: string[] | null; user: ProfileDTO };

function scopeOn(column: any, scope: Scope): SQL | undefined {
  if (scope.ids === null) return undefined;
  if (scope.ids.length === 0) return eq(column, "00000000-0000-0000-0000-000000000000");
  return inArray(column, scope.ids);
}

function startOfDay(d = new Date()) {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfDay(d = new Date()) {
  const copy = new Date(d);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

export async function loadScopedData(user: ProfileDTO): Promise<Bootstrap> {
  const ids = await visibleClientIds(user);
  const scope: Scope = { ids, user };

  /* ---------------- clients & doctors ---------------- */
  const clientsQuery = db
    .select(PROFILE_COLUMNS)
    .from(profiles)
    .where(
      and(
        eq(profiles.role, "client"),
        ids === null
          ? undefined
          : ids.length === 0
            ? eq(profiles.id, "00000000-0000-0000-0000-000000000000")
            : inArray(profiles.id, ids),
      ),
    )
    .orderBy(asc(profiles.fullName));

  const [clientRows, doctorRows, assignmentRows] = await Promise.all([
    clientsQuery,
    db
      .select(PROFILE_COLUMNS)
      .from(profiles)
      .where(
        user.role === "admin"
          ? eq(profiles.role, "doctor")
          : or(eq(profiles.id, user.id), eq(profiles.role, "doctor")),
      )
      .orderBy(asc(profiles.fullName)),
    db
      .select({
        id: clientDoctors.id,
        clientId: clientDoctors.clientId,
        doctorId: clientDoctors.doctorId,
        note: clientDoctors.note,
        assignedAt: clientDoctors.assignedAt,
        clientName: clientP.fullName,
        clientEmail: clientP.email,
        doctorName: doctorP.fullName,
        doctorSpecialization: doctorP.specialization,
      })
      .from(clientDoctors)
      .leftJoin(clientP, eq(clientP.id, clientDoctors.clientId))
      .leftJoin(doctorP, eq(doctorP.id, clientDoctors.doctorId))
      .where(
        user.role === "admin"
          ? undefined
          : user.role === "doctor"
            ? eq(clientDoctors.doctorId, user.id)
            : eq(clientDoctors.clientId, user.id),
      )
      .orderBy(desc(clientDoctors.assignedAt)),
  ]);

  const visibleDoctors =
    user.role === "doctor"
      ? (doctorRows.filter((d) => d.id === user.id) as unknown as ProfileDTO[])
      : user.role === "client"
        ? (assignmentRows.length
            ? (doctorRows.filter((d) =>
                assignmentRows.some((a) => a.doctorId === d.id),
              ) as unknown as ProfileDTO[])
            : [])
        : (doctorRows as unknown as ProfileDTO[]);

  /* ---------------- appointments ---------------- */
  const apptWhere =
    user.role === "admin"
      ? undefined
      : user.role === "client"
        ? eq(appointments.clientId, user.id)
        : ids && ids.length > 0
          ? or(eq(appointments.doctorId, user.id), inArray(appointments.clientId, ids))
          : eq(appointments.doctorId, user.id);

  const apptRows = await db
    .select({
      id: appointments.id,
      clientId: appointments.clientId,
      doctorId: appointments.doctorId,
      scheduledAt: appointments.scheduledAt,
      durationMin: appointments.durationMin,
      kind: appointments.kind,
      status: appointments.status,
      location: appointments.location,
      notes: appointments.notes,
      price: appointments.price,
      createdAt: appointments.createdAt,
      clientName: clientP.fullName,
      clientPhone: clientP.phone,
      doctorName: doctorP.fullName,
    })
    .from(appointments)
    .leftJoin(clientP, eq(clientP.id, appointments.clientId))
    .leftJoin(doctorP, eq(doctorP.id, appointments.doctorId))
    .where(apptWhere)
    .orderBy(desc(appointments.scheduledAt));

  /* ---------------- invoices & installment payments ---------------- */
  const invoiceRows = await db
    .select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      appointmentId: invoices.appointmentId,
      clientId: invoices.clientId,
      doctorId: invoices.doctorId,
      totalAmount: invoices.totalAmount,
      createdAt: invoices.createdAt,
      clientName: clientP.fullName,
      doctorName: doctorP.fullName,
      appointmentKind: appointments.kind,
    })
    .from(invoices)
    .leftJoin(clientP, eq(clientP.id, invoices.clientId))
    .leftJoin(doctorP, eq(doctorP.id, invoices.doctorId))
    .leftJoin(appointments, eq(appointments.id, invoices.appointmentId))
    .where(user.role === "admin" ? undefined : scopeOn(invoices.clientId, scope))
    .orderBy(desc(invoices.createdAt));

  const paymentRows = invoiceRows.length
    ? await db.select().from(invoicePayments).where(inArray(invoicePayments.invoiceId, invoiceRows.map((row) => row.id))).orderBy(desc(invoicePayments.paidAt))
    : [];
  const invoiceList = invoiceRows.map((row) => {
    const payments = paymentRows.filter((payment) => payment.invoiceId === row.id).map((payment) => ({ ...payment, paidAt: iso(payment.paidAt) }));
    const paidAmount = payments.reduce((sum, payment) => sum + payment.amount, 0);
    return { ...row, createdAt: iso(row.createdAt), payments, paidAmount, remainingAmount: Math.max(0, row.totalAmount - paidAmount), status: paidAmount <= 0 ? "unpaid" as const : paidAmount >= row.totalAmount ? "paid" as const : "partially_paid" as const };
  });

  /* ---------------- history ---------------- */
  const historyRows = await db
    .select({
      id: appointmentHistory.id,
      appointmentId: appointmentHistory.appointmentId,
      clientId: appointmentHistory.clientId,
      doctorId: appointmentHistory.doctorId,
      actorId: appointmentHistory.actorId,
      action: appointmentHistory.action,
      detail: appointmentHistory.detail,
      createdAt: appointmentHistory.createdAt,
      clientName: clientP.fullName,
      actorName: actorP.fullName,
    })
    .from(appointmentHistory)
    .leftJoin(clientP, eq(clientP.id, appointmentHistory.clientId))
    .leftJoin(actorP, eq(actorP.id, appointmentHistory.actorId))
    .where(user.role === "admin" ? undefined : scopeOn(appointmentHistory.clientId, scope))
    .orderBy(desc(appointmentHistory.createdAt))
    .limit(60);

  /* ---------------- medical records ---------------- */
  const recordRows = await db
    .select({
      id: medicalRecords.id,
      clientId: medicalRecords.clientId,
      doctorId: medicalRecords.doctorId,
      title: medicalRecords.title,
      visitDate: medicalRecords.visitDate,
      diagnosis: medicalRecords.diagnosis,
      symptoms: medicalRecords.symptoms,
      bloodPressure: medicalRecords.bloodPressure,
      heartRate: medicalRecords.heartRate,
      temperature: medicalRecords.temperature,
      weightKg: medicalRecords.weightKg,
      notes: medicalRecords.notes,
      createdAt: medicalRecords.createdAt,
      clientName: clientP.fullName,
      doctorName: doctorP.fullName,
    })
    .from(medicalRecords)
    .leftJoin(clientP, eq(clientP.id, medicalRecords.clientId))
    .leftJoin(doctorP, eq(doctorP.id, medicalRecords.doctorId))
    .where(scopeOn(medicalRecords.clientId, scope))
    .orderBy(desc(medicalRecords.visitDate));

  /* ---------------- treatment plans + doses ---------------- */
  const planRows = await db
    .select({
      id: treatmentPlans.id,
      clientId: treatmentPlans.clientId,
      doctorId: treatmentPlans.doctorId,
      title: treatmentPlans.title,
      description: treatmentPlans.description,
      startDate: treatmentPlans.startDate,
      endDate: treatmentPlans.endDate,
      status: treatmentPlans.status,
      sessionsTotal: treatmentPlans.sessionsTotal,
      sessionsDone: treatmentPlans.sessionsDone,
      createdAt: treatmentPlans.createdAt,
      clientName: clientP.fullName,
      doctorName: doctorP.fullName,
    })
    .from(treatmentPlans)
    .leftJoin(clientP, eq(clientP.id, treatmentPlans.clientId))
    .leftJoin(doctorP, eq(doctorP.id, treatmentPlans.doctorId))
    .where(scopeOn(treatmentPlans.clientId, scope))
    .orderBy(desc(treatmentPlans.createdAt));

  const doseRows = await db
    .select({
      id: medicationDoses.id,
      planId: medicationDoses.planId,
      clientId: medicationDoses.clientId,
      medicine: medicationDoses.medicine,
      dosage: medicationDoses.dosage,
      frequency: medicationDoses.frequency,
      timeOfDay: medicationDoses.timeOfDay,
      instructions: medicationDoses.instructions,
      startDate: medicationDoses.startDate,
      endDate: medicationDoses.endDate,
      active: medicationDoses.active,
      createdAt: medicationDoses.createdAt,
      clientName: clientP.fullName,
      planTitle: dosePlan.title,
    })
    .from(medicationDoses)
    .leftJoin(clientP, eq(clientP.id, medicationDoses.clientId))
    .leftJoin(dosePlan, eq(dosePlan.id, medicationDoses.planId))
    .where(scopeOn(medicationDoses.clientId, scope))
    .orderBy(desc(medicationDoses.active), asc(medicationDoses.createdAt));

  const doseLogRows = await db
    .select({
      id: doseLogs.id,
      doseId: doseLogs.doseId,
      clientId: doseLogs.clientId,
      takenAt: doseLogs.takenAt,
      note: doseLogs.note,
      medicine: medicationDoses.medicine,
    })
    .from(doseLogs)
    .leftJoin(medicationDoses, eq(medicationDoses.id, doseLogs.doseId))
    .where(scopeOn(doseLogs.clientId, scope))
    .orderBy(desc(doseLogs.takenAt))
    .limit(200);

  /* ---------------- diet ---------------- */
  const dietRows = await db
    .select({
      id: dietPlans.id,
      clientId: dietPlans.clientId,
      doctorId: dietPlans.doctorId,
      title: dietPlans.title,
      dailyCalories: dietPlans.dailyCalories,
      notes: dietPlans.notes,
      startDate: dietPlans.startDate,
      endDate: dietPlans.endDate,
      status: dietPlans.status,
      createdAt: dietPlans.createdAt,
      clientName: clientP.fullName,
      doctorName: doctorP.fullName,
    })
    .from(dietPlans)
    .leftJoin(clientP, eq(clientP.id, dietPlans.clientId))
    .leftJoin(doctorP, eq(doctorP.id, dietPlans.doctorId))
    .where(scopeOn(dietPlans.clientId, scope))
    .orderBy(desc(dietPlans.createdAt));

  const mealRows = await db
    .select({
      id: dietMeals.id,
      dietPlanId: dietMeals.dietPlanId,
      clientId: dietMeals.clientId,
      dayIndex: dietMeals.dayIndex,
      name: dietMeals.name,
      timeOfDay: dietMeals.timeOfDay,
      items: dietMeals.items,
      calories: dietMeals.calories,
      planTitle: mealPlan.title,
    })
    .from(dietMeals)
    .leftJoin(mealPlan, eq(mealPlan.id, dietMeals.dietPlanId))
    .where(scopeOn(dietMeals.clientId, scope))
    .orderBy(asc(dietMeals.dayIndex), asc(dietMeals.name));

  /* ---------------- notifications ---------------- */
  const notifRows = await db
    .select({
      id: notifications.id,
      userId: notifications.userId,
      actorId: notifications.actorId,
      clientId: notifications.clientId,
      title: notifications.title,
      body: notifications.body,
      kind: notifications.kind,
      link: notifications.link,
      readAt: notifications.readAt,
      createdAt: notifications.createdAt,
      actorName: actorP.fullName,
    })
    .from(notifications)
    .leftJoin(actorP, eq(actorP.id, notifications.actorId))
    .where(eq(notifications.userId, user.id))
    .orderBy(desc(notifications.createdAt))
    .limit(40);

  /* ---------------- derived values ---------------- */
  const appointmentList = apptRows.map((row) => ({
    ...row,
    scheduledAt: iso(row.scheduledAt),
    createdAt: iso(row.createdAt),
  })) as unknown as AppointmentDTO[];

  const today = startOfDay();
  const todayEnd = endOfDay();
  const upcoming = appointmentList.filter(
    (a) => ["scheduled", "pending_doctor", "pending_client"].includes(a.status) && new Date(a.scheduledAt) >= new Date(),
  );
  const todays = appointmentList.filter((a) => {
    const when = new Date(a.scheduledAt);
    return when >= today && when <= todayEnd;
  });

  const assignedClientIds = new Set(assignmentRows.map((a) => a.clientId));
  const stats: Stats = {
    clients: clientRows.length,
    doctors: user.role === "admin" ? doctorRows.length : visibleDoctors.length,
    appointmentsTotal: appointmentList.length,
    appointmentsToday: todays.length,
    appointmentsUpcoming: upcoming.length,
    completed: appointmentList.filter((a) => a.status === "completed").length,
    cancelled: appointmentList.filter((a) => a.status === "cancelled").length,
    revenue: paymentRows.reduce((sum, payment) => sum + payment.amount, 0),
    activePlans: planRows.filter((p) => p.status === "active").length,
    activeDietPlans: dietRows.filter((d) => d.status === "active").length,
    records: recordRows.length,
    unreadNotifications: notifRows.filter((n) => !n.readAt).length,
    unassignedClients:
      user.role === "admin"
        ? clientRows.filter((c) => !assignedClientIds.has(c.id)).length
        : 0,
  };

  return {
    me: user,
    clients: clientRows as unknown as ProfileDTO[],
    doctors: visibleDoctors,
    assignments: assignmentRows.map((a) => ({ ...a, assignedAt: iso(a.assignedAt) })) as unknown as AssignmentDTO[],
    appointments: appointmentList,
    invoices: invoiceList,
    history: historyRows.map((h) => ({ ...h, createdAt: iso(h.createdAt) })) as unknown as HistoryDTO[],
    records: recordRows.map((r) => ({ ...r, createdAt: iso(r.createdAt) })) as unknown as RecordDTO[],
    plans: planRows.map((p) => ({ ...p, createdAt: iso(p.createdAt) })) as unknown as PlanDTO[],
    doses: doseRows.map((d) => ({ ...d, createdAt: iso(d.createdAt) })) as unknown as DoseDTO[],
    doseLogs: doseLogRows.map((l) => ({ ...l, takenAt: iso(l.takenAt) })) as unknown as DoseLogDTO[],
    dietPlans: dietRows.map((d) => ({ ...d, createdAt: iso(d.createdAt) })) as unknown as DietPlanDTO[],
    meals: mealRows as unknown as MealDTO[],
    notifications: notifRows.map((n) => ({
      ...n,
      createdAt: iso(n.createdAt),
      readAt: n.readAt ? iso(n.readAt) : null,
    })) as unknown as NotificationDTO[],
    stats,
  };
}


