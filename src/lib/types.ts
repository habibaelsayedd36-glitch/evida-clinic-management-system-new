export type Role = "admin" | "doctor" | "client";

export type ProfileDTO = {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  phone: string | null;
  gender: string | null;
  birthDate: string | null;
  avatarHue: number;
  isActive: boolean;
  specialization: string | null;
  licenseNumber: string | null;
  bio: string | null;
  heightCm: number | null;
  weightKg: number | null;
  targetWeightKg: number | null;
  bloodType: string | null;
  allergies: string | null;
  medicalNotes: string | null;
  createdAt: string;
};

export type AssignmentDTO = {
  id: string;
  clientId: string;
  doctorId: string;
  note: string | null;
  assignedAt: string;
  clientName: string;
  clientEmail: string;
  doctorName: string;
  doctorSpecialization: string | null;
};

export type AppointmentDTO = {
  id: string;
  clientId: string;
  doctorId: string;
  scheduledAt: string;
  durationMin: number;
  kind: string;
  status: string;
  location: string | null;
  notes: string | null;
  price: number | null;
  createdAt: string;
  clientName: string;
  clientPhone: string | null;
  doctorName: string;
};

export type HistoryDTO = {
  id: string;
  appointmentId: string | null;
  clientId: string | null;
  doctorId: string | null;
  actorId: string | null;
  action: string;
  detail: string | null;
  createdAt: string;
  clientName: string | null;
  actorName: string | null;
};

export type RecordDTO = {
  id: string;
  clientId: string;
  doctorId: string | null;
  title: string;
  visitDate: string;
  diagnosis: string | null;
  symptoms: string | null;
  bloodPressure: string | null;
  heartRate: number | null;
  temperature: number | null;
  weightKg: number | null;
  notes: string | null;
  createdAt: string;
  clientName: string;
  doctorName: string | null;
};

export type PlanDTO = {
  id: string;
  clientId: string;
  doctorId: string | null;
  title: string;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  status: string;
  sessionsTotal: number;
  sessionsDone: number;
  createdAt: string;
  clientName: string;
  doctorName: string | null;
};

export type DoseDTO = {
  id: string;
  planId: string | null;
  clientId: string;
  medicine: string;
  dosage: string | null;
  frequency: string | null;
  timeOfDay: string | null;
  instructions: string | null;
  startDate: string | null;
  endDate: string | null;
  active: boolean;
  createdAt: string;
  clientName: string;
  planTitle: string | null;
};

export type DoseLogDTO = {
  id: string;
  doseId: string;
  clientId: string;
  takenAt: string;
  note: string | null;
  medicine?: string;
};

export type DietPlanDTO = {
  id: string;
  clientId: string;
  doctorId: string | null;
  title: string;
  dailyCalories: number | null;
  notes: string | null;
  startDate: string | null;
  endDate: string | null;
  status: string;
  createdAt: string;
  clientName: string;
  doctorName: string | null;
};

export type MealDTO = {
  id: string;
  dietPlanId: string;
  clientId: string;
  dayIndex: number;
  name: string;
  timeOfDay: string;
  items: string | null;
  calories: number | null;
  planTitle?: string;
};

export type NotificationDTO = {
  id: string;
  userId: string;
  actorId: string | null;
  clientId: string | null;
  title: string;
  body: string | null;
  kind: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
  actorName: string | null;
};

export type Stats = {
  clients: number;
  doctors: number;
  appointmentsTotal: number;
  appointmentsToday: number;
  appointmentsUpcoming: number;
  completed: number;
  cancelled: number;
  revenue: number;
  activePlans: number;
  activeDietPlans: number;
  records: number;
  unreadNotifications: number;
  unassignedClients: number;
};

export type Bootstrap = {
  me: ProfileDTO;
  clients: ProfileDTO[];
  doctors: ProfileDTO[];
  assignments: AssignmentDTO[];
  appointments: AppointmentDTO[];
  history: HistoryDTO[];
  records: RecordDTO[];
  plans: PlanDTO[];
  doses: DoseDTO[];
  doseLogs: DoseLogDTO[];
  dietPlans: DietPlanDTO[];
  meals: MealDTO[];
  notifications: NotificationDTO[];
  stats: Stats;
};

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  doctor: "Doctor",
  client: "Client",
};

export const KIND_LABELS: Record<string, string> = {
  consultation: "First consultation",
  followup: "Follow-up",
  session: "Session",
  lab: "Labs / measurements",
  nutrition: "Nutrition session",
};

export const STATUS_LABELS: Record<string, string> = {
  scheduled: "Confirmed",
  pending_doctor: "Awaiting doctor confirmation",
  pending_client: "Awaiting client confirmation",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No show",
  active: "Active",
  paused: "Paused",
  finished: "Finished",
  draft: "Draft",
};

export const TIME_LABELS: Record<string, string> = {
  breakfast: "Breakfast",
  snack1: "Snack 1",
  lunch: "Lunch",
  snack2: "Snack 2",
  dinner: "Dinner",
  morning: "Morning",
  noon: "Noon",
  evening: "Evening",
  night: "Bedtime",
};

export const APPOINTMENT_KINDS = Object.keys(KIND_LABELS).filter(
  (k) => !["active", "paused", "finished", "draft"].includes(k),
);

export const APPOINTMENT_STATUSES = ["scheduled", "completed", "cancelled", "no_show"];
export const PLAN_STATUSES = ["active", "paused", "finished"];
export const MEAL_TIMES = ["breakfast", "snack1", "lunch", "snack2", "dinner"];
export const DOSE_TIMES = ["morning", "noon", "evening", "night"];
