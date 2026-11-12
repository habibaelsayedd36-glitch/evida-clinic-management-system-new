import { pool, db } from "@/db";
import { hashPassword } from "@/lib/crypto";
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
import { eq } from "drizzle-orm";

/** DDL kept 1:1 with src/db/schema.ts so a fresh database self-heals on boot. */
const DDL = `
CREATE TABLE IF NOT EXISTS "profiles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "email" text NOT NULL,
  CONSTRAINT "profiles_email_unique" UNIQUE("email"),
  "password_hash" text NOT NULL,
  "full_name" text NOT NULL,
  "role" text DEFAULT 'client' NOT NULL,
  "phone" text,
  "gender" text,
  "birth_date" date,
  "avatar_hue" integer DEFAULT 168 NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "specialization" text,
  "license_number" text,
  "bio" text,
  "height_cm" real,
  "weight_kg" real,
  "target_weight_kg" real,
  "blood_type" text,
  "allergies" text,
  "medical_notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "client_doctors" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "client_id" uuid NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  CONSTRAINT "client_doctors_client_id_unique" UNIQUE("client_id"),
  "doctor_id" uuid NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  "note" text,
  "assigned_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "client_doctors_doctor_idx" ON "client_doctors" ("doctor_id");
CREATE TABLE IF NOT EXISTS "appointments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "client_id" uuid NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  "doctor_id" uuid NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  "scheduled_at" timestamp with time zone NOT NULL,
  "duration_min" integer DEFAULT 30 NOT NULL,
  "kind" text DEFAULT 'consultation' NOT NULL,
  "status" text DEFAULT 'scheduled' NOT NULL,
  "location" text,
  "notes" text,
  "price" integer,
  "created_by" uuid REFERENCES "profiles"("id") ON DELETE SET NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "appointments_client_idx" ON "appointments" ("client_id");
CREATE INDEX IF NOT EXISTS "appointments_doctor_idx" ON "appointments" ("doctor_id");
CREATE INDEX IF NOT EXISTS "appointments_when_idx" ON "appointments" ("scheduled_at");
CREATE TABLE IF NOT EXISTS "appointment_history" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "appointment_id" uuid REFERENCES "appointments"("id") ON DELETE CASCADE,
  "client_id" uuid REFERENCES "profiles"("id") ON DELETE CASCADE,
  "doctor_id" uuid REFERENCES "profiles"("id") ON DELETE SET NULL,
  "actor_id" uuid REFERENCES "profiles"("id") ON DELETE SET NULL,
  "action" text NOT NULL,
  "detail" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "appointment_history_client_idx" ON "appointment_history" ("client_id");
CREATE TABLE IF NOT EXISTS "medical_records" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "client_id" uuid NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  "doctor_id" uuid REFERENCES "profiles"("id") ON DELETE SET NULL,
  "title" text NOT NULL,
  "visit_date" date NOT NULL,
  "diagnosis" text,
  "symptoms" text,
  "blood_pressure" text,
  "heart_rate" integer,
  "temperature" real,
  "weight_kg" real,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "medical_records_client_idx" ON "medical_records" ("client_id");
CREATE TABLE IF NOT EXISTS "treatment_plans" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "client_id" uuid NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  "doctor_id" uuid REFERENCES "profiles"("id") ON DELETE SET NULL,
  "title" text NOT NULL,
  "description" text,
  "start_date" date,
  "end_date" date,
  "status" text DEFAULT 'active' NOT NULL,
  "sessions_total" integer DEFAULT 0 NOT NULL,
  "sessions_done" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "treatment_plans_client_idx" ON "treatment_plans" ("client_id");
CREATE TABLE IF NOT EXISTS "medication_doses" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "plan_id" uuid REFERENCES "treatment_plans"("id") ON DELETE CASCADE,
  "client_id" uuid NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  "medicine" text NOT NULL,
  "dosage" text,
  "frequency" text,
  "time_of_day" text,
  "instructions" text,
  "start_date" date,
  "end_date" date,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "medication_doses_client_idx" ON "medication_doses" ("client_id");
CREATE TABLE IF NOT EXISTS "dose_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "dose_id" uuid NOT NULL REFERENCES "medication_doses"("id") ON DELETE CASCADE,
  "client_id" uuid NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  "taken_at" timestamp with time zone DEFAULT now() NOT NULL,
  "note" text
);
CREATE INDEX IF NOT EXISTS "dose_logs_client_idx" ON "dose_logs" ("client_id");
CREATE TABLE IF NOT EXISTS "diet_plans" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "client_id" uuid NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  "doctor_id" uuid REFERENCES "profiles"("id") ON DELETE SET NULL,
  "title" text NOT NULL,
  "daily_calories" integer,
  "notes" text,
  "start_date" date,
  "end_date" date,
  "status" text DEFAULT 'active' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "diet_plans_client_idx" ON "diet_plans" ("client_id");
CREATE TABLE IF NOT EXISTS "diet_meals" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "diet_plan_id" uuid NOT NULL REFERENCES "diet_plans"("id") ON DELETE CASCADE,
  "client_id" uuid NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  "day_index" integer DEFAULT 1 NOT NULL,
  "name" text NOT NULL,
  "time_of_day" text DEFAULT 'breakfast' NOT NULL,
  "items" text,
  "calories" integer
);
CREATE INDEX IF NOT EXISTS "diet_meals_plan_idx" ON "diet_meals" ("diet_plan_id");
CREATE TABLE IF NOT EXISTS "notifications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  "actor_id" uuid REFERENCES "profiles"("id") ON DELETE SET NULL,
  "client_id" uuid REFERENCES "profiles"("id") ON DELETE CASCADE,
  "title" text NOT NULL,
  "body" text,
  "kind" text DEFAULT 'info' NOT NULL,
  "link" text,
  "read_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "notifications_user_idx" ON "notifications" ("user_id");
CREATE TABLE IF NOT EXISTS "clinic_offers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "title" text NOT NULL,
  "category" text NOT NULL DEFAULT 'service',
  "description" text,
  "protocol_details" text,
  "price" integer,
  "original_price" integer,
  "package_size" text,
  "valid_until" date,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
`;

const day = (offset: number, hour = 10, minute = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  d.setHours(hour, minute, 0, 0);
  return d;
};
const dateStr = (offset: number) => day(offset).toISOString().slice(0, 10);

type SeedUser = {
  email: string;
  password: string;
  fullName: string;
  role: "admin" | "doctor" | "client";
  phone: string;
  gender: "male" | "female";
  avatarHue: number;
  extra?: Record<string, unknown>;
};

const SEED_USERS: SeedUser[] = [
  {
    email: "admin@evida.clinic",
    password: "Admin@123",
    fullName: "Habiba Elsayed",
    role: "admin",
    phone: "01000000001",
    gender: "female",
    avatarHue: 268,
    extra: { bio: "EVIDA clinic manager — staff, scheduling, reporting and client assignments." },
  },
  {
    email: "omnia@evida.clinic",
    password: "Doctor@123",
    fullName: "Dr. Omnia",
    role: "doctor",
    phone: "01000000002",
    gender: "male",
    avatarHue: 252,
    extra: {
      specialization: "Clinical nutrition & obesity",
      licenseNumber: "EG-2014-77812",
      bio: "Clinical nutrition consultant focused on weight-loss programmes and diabetes follow-up.",
    },
  },
  {
    email: "mohab@evida.clinic",
    password: "Doctor@123",
    fullName: "Dr. Mohab",
    role: "doctor",
    phone: "01000000003",
    gender: "female",
    avatarHue: 284,
    extra: {
      specialization: "Physiotherapy & rehabilitation",
      licenseNumber: "EG-2016-31945",
      bio: "Physiotherapist specialising in spine and joint rehabilitation.",
    },
  },
  {
    email: "mona@evida.clinic",
    password: "Client@123",
    fullName: "Mona Abdelrahman",
    role: "client",
    phone: "01111111111",
    gender: "female",
    avatarHue: 296,
    extra: {
      heightCm: 164,
      weightKg: 82.5,
      targetWeightKg: 70,
      bloodType: "O+",
      allergies: "Lactose intolerant",
      birthDate: "1992-04-18",
    },
  },
  {
    email: "karim@evida.clinic",
    password: "Client@123",
    fullName: "Karim Salah",
    role: "client",
    phone: "01111111112",
    gender: "male",
    avatarHue: 244,
    extra: {
      heightCm: 178,
      weightKg: 96,
      targetWeightKg: 84,
      bloodType: "A+",
      allergies: "None known",
      birthDate: "1988-11-02",
      medicalNotes: "Mild hypertension, on daily medication.",
    },
  },
  {
    email: "yara@evida.clinic",
    password: "Client@123",
    fullName: "Yara Mostafa",
    role: "client",
    phone: "01111111113",
    gender: "female",
    avatarHue: 280,
    extra: {
      heightCm: 160,
      weightKg: 61,
      targetWeightKg: 58,
      bloodType: "B+",
      allergies: "Penicillin allergy",
      birthDate: "1996-07-25",
    },
  },
  {
    email: "hossam@evida.clinic",
    password: "Client@123",
    fullName: "Hossam Ali",
    role: "client",
    phone: "01111111114",
    gender: "male",
    avatarHue: 260,
    extra: {
      heightCm: 182,
      weightKg: 88,
      targetWeightKg: 85,
      bloodType: "AB+",
      birthDate: "1985-01-12",
      medicalNotes: "Lumbar disc herniation — 12-session rehabilitation programme.",
    },
  },
  {
    email: "salma@evida.clinic",
    password: "Client@123",
    fullName: "Salma Ibrahim",
    role: "client",
    phone: "01111111115",
    gender: "female",
    avatarHue: 290,
    extra: {
      heightCm: 170,
      weightKg: 74,
      targetWeightKg: 66,
      bloodType: "O-",
      birthDate: "1999-03-09",
    },
  },
  {
    email: "tarek@evida.clinic",
    password: "Client@123",
    fullName: "Tarek Mansour",
    role: "client",
    phone: "01111111116",
    gender: "male",
    avatarHue: 238,
    extra: { heightCm: 175, weightKg: 103, targetWeightKg: 88, birthDate: "1979-09-30" },
  },
];

export async function bootstrapDatabase() {
  await pool.query(DDL);

  const existing = await db.select({ id: profiles.id }).from(profiles).limit(1);
  if (existing.length > 0) return { seeded: false };

  const ids: Record<string, string> = {};
  for (const seed of SEED_USERS) {
    const [row] = await db
      .insert(profiles)
      .values({
        email: seed.email,
        passwordHash: hashPassword(seed.password),
        fullName: seed.fullName,
        role: seed.role,
        phone: seed.phone,
        gender: seed.gender,
        avatarHue: seed.avatarHue,
        ...(seed.extra ?? {}),
      } as never)
      .returning({ id: profiles.id });
    ids[seed.email] = row.id;
  }

  const admin = ids["admin@evida.clinic"];
  const d1 = ids["omnia@evida.clinic"];
  const d2 = ids["mohab@evida.clinic"];

  /* --- assignments (Tarek stays unassigned on purpose) --- */
  const assignments = [
    { clientId: ids["mona@evida.clinic"], doctorId: d1, note: "6-month weight-loss programme" },
    { clientId: ids["karim@evida.clinic"], doctorId: d1, note: "Diabetes and blood pressure follow-up" },
    { clientId: ids["salma@evida.clinic"], doctorId: d1, note: "Sports nutrition" },
    { clientId: ids["yara@evida.clinic"], doctorId: d2, note: "Neck and shoulder rehabilitation" },
    { clientId: ids["hossam@evida.clinic"], doctorId: d2, note: "12 physiotherapy sessions" },
  ];
  for (const a of assignments) {
    await db.insert(clientDoctors).values(a);
  }

  /* --- appointments --- */
  const apptSeeds = [
    { c: "mona@evida.clinic", d: d1, at: day(-14, 11), status: "completed", kind: "consultation", price: 500 },
    { c: "mona@evida.clinic", d: d1, at: day(-3, 12, 30), status: "completed", kind: "followup", price: 350 },
    { c: "mona@evida.clinic", d: d1, at: day(1, 11), status: "scheduled", kind: "nutrition", price: 350 },
    { c: "karim@evida.clinic", d: d1, at: day(-7, 17), status: "completed", kind: "followup", price: 350 },
    { c: "karim@evida.clinic", d: d1, at: day(0, 18, 30), status: "scheduled", kind: "lab", price: 200 },
    { c: "salma@evida.clinic", d: d1, at: day(2, 13), status: "scheduled", kind: "consultation", price: 500 },
    { c: "salma@evida.clinic", d: d1, at: day(-21, 13), status: "cancelled", kind: "followup", price: 350 },
    { c: "yara@evida.clinic", d: d2, at: day(-5, 10), status: "completed", kind: "session", price: 300 },
    { c: "yara@evida.clinic", d: d2, at: day(0, 10, 30), status: "scheduled", kind: "session", price: 300 },
    { c: "hossam@evida.clinic", d: d2, at: day(-2, 16), status: "completed", kind: "session", price: 300 },
    { c: "hossam@evida.clinic", d: d2, at: day(1, 16), status: "scheduled", kind: "session", price: 300 },
    { c: "hossam@evida.clinic", d: d2, at: day(4, 16), status: "scheduled", kind: "followup", price: 350 },
  ];
  let apptCount = 0;
  for (const a of apptSeeds) {
    const [row] = await db
      .insert(appointments)
      .values({
        clientId: ids[a.c],
        doctorId: a.d,
        scheduledAt: a.at,
        kind: a.kind,
        status: a.status,
        durationMin: 30,
        location: "EVIDA Clinic — New Cairo, GOE Medical Park Mall 3",
        price: a.price,
        createdBy: admin,
        notes: a.status === "cancelled" ? "Client cancelled one day in advance" : null,
      })
      .returning({ id: appointments.id });
    apptCount += 1;
    await db.insert(appointmentHistory).values({
      appointmentId: row.id,
      clientId: ids[a.c],
      doctorId: a.d,
      actorId: admin,
      action: a.status === "scheduled" ? "created" : a.status,
      detail: `${a.kind} appointment — ${a.at.toLocaleDateString("en-GB")}`,
      createdAt: a.at,
    });
  }

  /* --- medical records --- */
  await db.insert(medicalRecords).values([
    {
      clientId: ids["mona@evida.clinic"],
      doctorId: d1,
      title: "Initial nutrition assessment",
      visitDate: dateStr(-14),
      diagnosis: "Class I obesity with mild insulin resistance",
      symptoms: "Post-meal fatigue, gradual weight gain",
      bloodPressure: "120/80",
      heartRate: 78,
      temperature: 36.7,
      weightKg: 84,
      notes: "Ordered HbA1c and a full blood count.",
    },
    {
      clientId: ids["karim@evida.clinic"],
      doctorId: d1,
      title: "Blood pressure & glucose follow-up",
      visitDate: dateStr(-7),
      diagnosis: "Hypertension controlled with medication",
      symptoms: "Occasional morning headache",
      bloodPressure: "135/88",
      heartRate: 82,
      temperature: 36.9,
      weightKg: 96.5,
      notes: "Reduce salt intake and walk 30 minutes daily.",
    },
    {
      clientId: ids["hossam@evida.clinic"],
      doctorId: d2,
      title: "Physiotherapy assessment",
      visitDate: dateStr(-9),
      diagnosis: "L4-L5 disc herniation",
      symptoms: "Pain radiating to the left leg with numbness",
      bloodPressure: "130/85",
      heartRate: 74,
      temperature: 36.6,
      weightKg: 88,
      notes: "No heavy lifting; core and back strengthening programme.",
    },
    {
      clientId: ids["yara@evida.clinic"],
      doctorId: d2,
      title: "Shoulder rehabilitation session",
      visitDate: dateStr(-5),
      diagnosis: "Trapezius muscle strain",
      symptoms: "Pain after long hours at the laptop",
      heartRate: 70,
      temperature: 36.5,
      weightKg: 61,
      notes: "Daily stretching exercises plus posture correction.",
    },
  ]);

  /* --- treatment plans + doses --- */
  const [planMona] = await db
    .insert(treatmentPlans)
    .values({
      clientId: ids["mona@evida.clinic"],
      doctorId: d1,
      title: "Weight-loss programme — 6 months",
      description: "500 kcal daily deficit with weekly follow-up and measurements every two weeks.",
      startDate: dateStr(-14),
      endDate: dateStr(160),
      status: "active",
      sessionsTotal: 24,
      sessionsDone: 3,
    })
    .returning({ id: treatmentPlans.id });

  const [planHossam] = await db
    .insert(treatmentPlans)
    .values({
      clientId: ids["hossam@evida.clinic"],
      doctorId: d2,
      title: "Spine rehabilitation — 12 sessions",
      description: "Physiotherapy sessions plus a daily home strengthening routine.",
      startDate: dateStr(-9),
      endDate: dateStr(40),
      status: "active",
      sessionsTotal: 12,
      sessionsDone: 4,
    })
    .returning({ id: treatmentPlans.id });

  await db.insert(medicationDoses).values([
    {
      planId: planMona.id,
      clientId: ids["mona@evida.clinic"],
      medicine: "Metformin 500mg",
      dosage: "1 tablet",
      frequency: "Twice daily",
      timeOfDay: "morning",
      instructions: "Take right after a meal",
      startDate: dateStr(-14),
      endDate: dateStr(60),
      active: true,
    },
    {
      planId: planMona.id,
      clientId: ids["mona@evida.clinic"],
      medicine: "Vitamin D3 1000IU",
      dosage: "1 capsule",
      frequency: "Once daily",
      timeOfDay: "evening",
      instructions: "Take with a meal containing healthy fat",
      startDate: dateStr(-14),
      endDate: dateStr(90),
      active: true,
    },
    {
      planId: planHossam.id,
      clientId: ids["hossam@evida.clinic"],
      medicine: "Muscle relaxant (Myolastan)",
      dosage: "1 tablet",
      frequency: "Once daily",
      timeOfDay: "night",
      instructions: "Before bed — may cause drowsiness",
      startDate: dateStr(-9),
      endDate: dateStr(12),
      active: true,
    },
  ]);

  const [firstDose] = await db
    .select({ id: medicationDoses.id })
    .from(medicationDoses)
    .where(eq(medicationDoses.medicine, "Metformin 500mg"))
    .limit(1);

  if (firstDose) {
    await db.insert(doseLogs).values(
      [-1, -2, -3].map((offset) => ({
        doseId: firstDose.id,
        clientId: ids["mona@evida.clinic"],
        takenAt: day(offset, 9),
        note: offset === -3 ? "Took it a bit later than breakfast" : null,
      })),
    );
  }

  /* --- diet plans + meals --- */
  const [dietMona] = await db
    .insert(dietPlans)
    .values({
      clientId: ids["mona@evida.clinic"],
      doctorId: d1,
      title: "1500 kcal plan — week 1",
      dailyCalories: 1500,
      notes: "Drink 2.5L of water. No fried food and no soft drinks.",
      startDate: dateStr(-10),
      endDate: dateStr(18),
      status: "active",
    })
    .returning({ id: dietPlans.id });

  const [dietHossam] = await db
    .insert(dietPlans)
    .values({
      clientId: ids["hossam@evida.clinic"],
      doctorId: d2,
      title: "Anti-inflammatory plan",
      dailyCalories: 2100,
      notes: "Focus on omega-3 sources and reduce added sugar.",
      startDate: dateStr(-6),
      endDate: dateStr(22),
      status: "active",
    })
    .returning({ id: dietPlans.id });

  await db.insert(dietMeals).values([
    {
      dietPlanId: dietMona.id,
      clientId: ids["mona@evida.clinic"],
      dayIndex: 1,
      name: "Breakfast",
      timeOfDay: "breakfast",
      items: "2 boiled eggs + 1 slice whole-wheat toast + cucumber and tomato",
      calories: 320,
    },
    {
      dietPlanId: dietMona.id,
      clientId: ids["mona@evida.clinic"],
      dayIndex: 1,
      name: "Snack",
      timeOfDay: "snack1",
      items: "1 apple + 10 almonds",
      calories: 180,
    },
    {
      dietPlanId: dietMona.id,
      clientId: ids["mona@evida.clinic"],
      dayIndex: 1,
      name: "Lunch",
      timeOfDay: "lunch",
      items: "150g grilled chicken breast + 4 tbsp brown rice + green salad",
      calories: 520,
    },
    {
      dietPlanId: dietMona.id,
      clientId: ids["mona@evida.clinic"],
      dayIndex: 1,
      name: "Dinner",
      timeOfDay: "dinner",
      items: "Greek yogurt + 1 tbsp oats + berries",
      calories: 240,
    },
    {
      dietPlanId: dietHossam.id,
      clientId: ids["hossam@evida.clinic"],
      dayIndex: 1,
      name: "Breakfast",
      timeOfDay: "breakfast",
      items: "Oats with skim milk + 1 banana + 1 tsp honey",
      calories: 430,
    },
    {
      dietPlanId: dietHossam.id,
      clientId: ids["hossam@evida.clinic"],
      dayIndex: 1,
      name: "Lunch",
      timeOfDay: "lunch",
      items: "200g grilled salmon + baked sweet potato + broccoli",
      calories: 680,
    },
    {
      dietPlanId: dietHossam.id,
      clientId: ids["hossam@evida.clinic"],
      dayIndex: 1,
      name: "Dinner",
      timeOfDay: "dinner",
      items: "Tuna salad with olive oil + 1 slice whole-wheat bread",
      calories: 380,
    },
  ]);

  /* --- notifications --- */
  await db.insert(notifications).values([
    {
      userId: admin,
      actorId: d1,
      title: "New appointment added",
      body: "Dr. Omnia booked a follow-up for Mona Abdelrahman tomorrow at 11:00.",
      kind: "appointment",
    },
    {
      userId: admin,
      title: "Client without a doctor",
      body: "Tarek Mansour is not linked to any doctor yet — needs assignment.",
      kind: "warning",
    },
    {
      userId: d1,
      title: "Appointment today",
      body: "Karim Salah has labs and measurements at 6:30 PM.",
      kind: "appointment",
    },
    {
      userId: d2,
      title: "Session today",
      body: "Yara Mostafa — shoulder rehabilitation session at 10:30 AM.",
      kind: "appointment",
    },
    {
      userId: ids["mona@evida.clinic"],
      actorId: d1,
      title: "Your diet plan is ready",
      body: "Dr. Omnia uploaded the 1500 kcal plan — open the Diet section to view it.",
      kind: "diet",
    },
    {
      userId: ids["mona@evida.clinic"],
      actorId: admin,
      title: "Appointment confirmed",
      body: "Your appointment with Dr. Omnia is tomorrow at 11:00 AM.",
      kind: "appointment",
    },
    {
      userId: ids["hossam@evida.clinic"],
      actorId: d2,
      title: "Remember your dose",
      body: "Take the muscle relaxant before bed and log it from the Treatment section.",
      kind: "medication",
    },
  ]);

  return { seeded: true, appointments: apptCount };
}

export async function isBootstrapped() {
  const rows = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(eq(profiles.role, "admin"))
    .limit(1);
  return rows.length > 0;
}
