import {
  boolean,
  date,
  index,
  integer,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * EVIDA Clinic — data model.
 *
 * Access rules (enforced server side in src/lib/acl.ts, the equivalent of the
 * Supabase RLS policies + is_admin()/is_assigned_doctor()/can_access_client()):
 *  - admin  → everything
 *  - doctor → only clients assigned to him in `client_doctors`
 *  - client → only his own rows
 */

export type Role = "admin" | "doctor" | "client";

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  fullName: text("full_name").notNull(),
  role: text("role").notNull().default("client"),
  phone: text("phone"),
  gender: text("gender"),
  birthDate: date("birth_date"),
  avatarHue: integer("avatar_hue").notNull().default(168),
  isActive: boolean("is_active").notNull().default(true),
  // staff only
  specialization: text("specialization"),
  licenseNumber: text("license_number"),
  bio: text("bio"),
  // clients only
  heightCm: real("height_cm"),
  weightKg: real("weight_kg"),
  targetWeightKg: real("target_weight_kg"),
  bloodType: text("blood_type"),
  allergies: text("allergies"),
  medicalNotes: text("medical_notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const clientDoctors = pgTable(
  "client_doctors",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .unique()
      .references(() => profiles.id, { onDelete: "cascade" }),
    doctorId: uuid("doctor_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    note: text("note"),
    assignedAt: timestamp("assigned_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("client_doctors_doctor_idx").on(t.doctorId)],
);

export const appointments = pgTable(
  "appointments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    doctorId: uuid("doctor_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
    durationMin: integer("duration_min").notNull().default(30),
    kind: text("kind").notNull().default("consultation"),
    status: text("status").notNull().default("scheduled"),
    location: text("location"),
    notes: text("notes"),
    price: integer("price"),
    createdBy: uuid("created_by").references(() => profiles.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("appointments_client_idx").on(t.clientId),
    index("appointments_doctor_idx").on(t.doctorId),
    index("appointments_when_idx").on(t.scheduledAt),
  ],
);

export const appointmentHistory = pgTable(
  "appointment_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    appointmentId: uuid("appointment_id").references(() => appointments.id, {
      onDelete: "cascade",
    }),
    clientId: uuid("client_id").references(() => profiles.id, { onDelete: "cascade" }),
    doctorId: uuid("doctor_id").references(() => profiles.id, { onDelete: "set null" }),
    actorId: uuid("actor_id").references(() => profiles.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    detail: text("detail"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("appointment_history_client_idx").on(t.clientId)],
);

export const medicalRecords = pgTable(
  "medical_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    doctorId: uuid("doctor_id").references(() => profiles.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    visitDate: date("visit_date").notNull(),
    diagnosis: text("diagnosis"),
    symptoms: text("symptoms"),
    bloodPressure: text("blood_pressure"),
    heartRate: integer("heart_rate"),
    temperature: real("temperature"),
    weightKg: real("weight_kg"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("medical_records_client_idx").on(t.clientId)],
);

export const invoices = pgTable(
  "invoices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    invoiceNumber: text("invoice_number").notNull().unique(),
    appointmentId: uuid("appointment_id").notNull().unique().references(() => appointments.id, { onDelete: "cascade" }),
    clientId: uuid("client_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    doctorId: uuid("doctor_id").references(() => profiles.id, { onDelete: "set null" }),
    totalAmount: integer("total_amount").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("invoices_client_idx").on(t.clientId)],
);

export const invoicePayments = pgTable(
  "invoice_payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    invoiceId: uuid("invoice_id").notNull().references(() => invoices.id, { onDelete: "cascade" }),
    amount: integer("amount").notNull(),
    method: text("method").notNull().default("cash"),
    reference: text("reference"),
    note: text("note"),
    receivedBy: uuid("received_by").references(() => profiles.id, { onDelete: "set null" }),
    paidAt: timestamp("paid_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("invoice_payments_invoice_idx").on(t.invoiceId)],
);

export const treatmentPlans = pgTable(
  "treatment_plans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    doctorId: uuid("doctor_id").references(() => profiles.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    description: text("description"),
    startDate: date("start_date"),
    endDate: date("end_date"),
    status: text("status").notNull().default("active"),
    sessionsTotal: integer("sessions_total").notNull().default(0),
    sessionsDone: integer("sessions_done").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("treatment_plans_client_idx").on(t.clientId)],
);

export const medicationDoses = pgTable(
  "medication_doses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    planId: uuid("plan_id").references(() => treatmentPlans.id, { onDelete: "cascade" }),
    clientId: uuid("client_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    medicine: text("medicine").notNull(),
    dosage: text("dosage"),
    frequency: text("frequency"),
    timeOfDay: text("time_of_day"),
    instructions: text("instructions"),
    startDate: date("start_date"),
    endDate: date("end_date"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("medication_doses_client_idx").on(t.clientId)],
);

export const doseLogs = pgTable(
  "dose_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    doseId: uuid("dose_id")
      .notNull()
      .references(() => medicationDoses.id, { onDelete: "cascade" }),
    clientId: uuid("client_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    takenAt: timestamp("taken_at", { withTimezone: true }).notNull().defaultNow(),
    note: text("note"),
  },
  (t) => [index("dose_logs_client_idx").on(t.clientId)],
);

export const dietPlans = pgTable(
  "diet_plans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    doctorId: uuid("doctor_id").references(() => profiles.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    dailyCalories: integer("daily_calories"),
    notes: text("notes"),
    startDate: date("start_date"),
    endDate: date("end_date"),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("diet_plans_client_idx").on(t.clientId)],
);

export const dietMeals = pgTable(
  "diet_meals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    dietPlanId: uuid("diet_plan_id")
      .notNull()
      .references(() => dietPlans.id, { onDelete: "cascade" }),
    clientId: uuid("client_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    dayIndex: integer("day_index").notNull().default(1),
    name: text("name").notNull(),
    timeOfDay: text("time_of_day").notNull().default("breakfast"),
    items: text("items"),
    calories: integer("calories"),
  },
  (t) => [index("diet_meals_plan_idx").on(t.dietPlanId)],
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    actorId: uuid("actor_id").references(() => profiles.id, { onDelete: "set null" }),
    clientId: uuid("client_id").references(() => profiles.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    body: text("body"),
    kind: text("kind").notNull().default("info"),
    link: text("link"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("notifications_user_idx").on(t.userId)],
);
