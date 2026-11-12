"use client";

import { useMemo, useState } from "react";
import {
  ClipboardList,
  FilePlus2,
  Pill,
  Plus,
  Salad,
  Stethoscope,
  Trash2,
  UtensilsCrossed,
  Pencil,
  Check,
} from "lucide-react";
import { api, bmi, bmiLabel, fmtDate, fmtDateTime, fmtShortDate, fmtTime } from "@/lib/client";
import {
  DOSE_TIMES,
  MEAL_TIMES,
  PLAN_STATUSES,
  STATUS_LABELS,
  TIME_LABELS,
  type AppointmentDTO,
  type Bootstrap,
  type DietPlanDTO,
  type DoseDTO,
  type DoseLogDTO,
  type MealDTO,
  type PlanDTO,
  type ProfileDTO,
  type RecordDTO,
} from "@/lib/types";
import { useSubmit } from "./forms";
import { Avatar, Badge, Button, Card, EmptyState, Field, Input, Modal, Progress, Select, STATUS_TONES, Textarea } from "./ui";

/* ------------------------------------------------------------------ */
/* forms                                                               */
/* ------------------------------------------------------------------ */

export function RecordForm({
  open,
  onClose,
  onDone,
  clientId,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  onDone: () => Promise<void>;
  clientId: string;
  initial?: RecordDTO | null;
}) {
  const [form, setForm] = useState(
    () =>
      initial
        ? {
            title: initial.title,
            visitDate: initial.visitDate,
            diagnosis: initial.diagnosis ?? "",
            symptoms: initial.symptoms ?? "",
            bloodPressure: initial.bloodPressure ?? "",
            heartRate: initial.heartRate?.toString() ?? "",
            temperature: initial.temperature?.toString() ?? "",
            weightKg: initial.weightKg?.toString() ?? "",
            notes: initial.notes ?? "",
          }
        : {
            title: "",
            visitDate: new Date().toISOString().slice(0, 10),
            diagnosis: "",
            symptoms: "",
            bloodPressure: "",
            heartRate: "",
            temperature: "",
            weightKg: "",
            notes: "",
          },
  );
  const { busy, run } = useSubmit(onDone);
  const set =
    (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((p) => ({ ...p, [k]: e.target.value }));

  async function submit() {
    const done = initial
      ? await run(() => api("PATCH", `/api/medical-records/${initial.id}`, form), "Record updated")
      : await run(() => api("POST", "/api/medical-records", { ...form, clientId }), "Medical record saved");
    if (done) onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title={initial ? "Edit medical record" : "Add a medical record"}
      subtitle="Diagnosis and vital signs for the visit"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button onClick={submit} loading={busy} icon={<FilePlus2 className="h-4 w-4" />} type="button">
            Save record
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Record title">
          <Input value={form.title} onChange={set("title")} placeholder="Initial nutrition assessment" />
        </Field>
        <Field label="Visit date">
          <Input type="date" value={form.visitDate} onChange={set("visitDate")} />
        </Field>
        <Field label="Diagnosis" className="sm:col-span-2">
          <Textarea value={form.diagnosis} onChange={set("diagnosis")} />
        </Field>
        <Field label="Symptoms" className="sm:col-span-2">
          <Textarea value={form.symptoms} onChange={set("symptoms")} />
        </Field>
        <Field label="Blood pressure">
          <Input value={form.bloodPressure} onChange={set("bloodPressure")} placeholder="120/80" />
        </Field>
        <Field label="Heart rate">
          <Input type="number" value={form.heartRate} onChange={set("heartRate")} />
        </Field>
        <Field label="Temperature">
          <Input type="number" step="0.1" value={form.temperature} onChange={set("temperature")} />
        </Field>
        <Field label="Weight (kg)">
          <Input type="number" step="0.1" value={form.weightKg} onChange={set("weightKg")} />
        </Field>
        <Field label="Notes" className="sm:col-span-2">
          <Textarea value={form.notes} onChange={set("notes")} />
        </Field>
      </div>
    </Modal>
  );
}

export function PlanForm({
  open,
  onClose,
  onDone,
  clientId,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  onDone: () => Promise<void>;
  clientId: string;
  initial?: PlanDTO | null;
}) {
  const [form, setForm] = useState(() => ({
    title: initial?.title ?? "",
    description: initial?.description ?? "",
    startDate: initial?.startDate ?? new Date().toISOString().slice(0, 10),
    endDate: initial?.endDate ?? "",
    status: initial?.status ?? "active",
    sessionsTotal: String(initial?.sessionsTotal ?? 8),
    sessionsDone: String(initial?.sessionsDone ?? 0),
  }));
  const { busy, run } = useSubmit(onDone);
  const set =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((p) => ({ ...p, [k]: e.target.value }));

  async function submit() {
    const payload = { ...form, sessionsTotal: Number(form.sessionsTotal), sessionsDone: Number(form.sessionsDone) };
    const done = initial
      ? await run(() => api("PATCH", `/api/treatment-plans/${initial.id}`, payload), "Plan updated")
      : await run(() => api("POST", "/api/treatment-plans", { ...payload, clientId }), "Treatment plan saved");
    if (done) onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? "Edit treatment plan" : "New treatment plan"}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button onClick={submit} loading={busy} icon={<ClipboardList className="h-4 w-4" />} type="button">
            Save
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Plan name" className="sm:col-span-2">
          <Input value={form.title} onChange={set("title")} placeholder="Weight-loss programme — 6 months" />
        </Field>
        <Field label="Description" className="sm:col-span-2">
          <Textarea value={form.description} onChange={set("description")} />
        </Field>
        <Field label="Start date">
          <Input type="date" value={form.startDate} onChange={set("startDate")} />
        </Field>
        <Field label="End date">
          <Input type="date" value={form.endDate} onChange={set("endDate")} />
        </Field>
        <Field label="Total sessions">
          <Input type="number" value={form.sessionsTotal} onChange={set("sessionsTotal")} />
        </Field>
        <Field label="Sessions completed">
          <Input type="number" value={form.sessionsDone} onChange={set("sessionsDone")} />
        </Field>
        <Field label="Status" className="sm:col-span-2">
          <Select value={form.status} onChange={set("status")}>
            {PLAN_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
        </Field>
      </div>
    </Modal>
  );
}

export function DoseForm({
  open,
  onClose,
  onDone,
  clientId,
  plans,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  onDone: () => Promise<void>;
  clientId: string;
  plans: PlanDTO[];
  initial?: DoseDTO | null;
}) {
  const [form, setForm] = useState(() => ({
    medicine: initial?.medicine ?? "",
    dosage: initial?.dosage ?? "",
    frequency: initial?.frequency ?? "",
    timeOfDay: initial?.timeOfDay ?? "morning",
    instructions: initial?.instructions ?? "",
    startDate: initial?.startDate ?? new Date().toISOString().slice(0, 10),
    endDate: initial?.endDate ?? "",
    planId: initial?.planId ?? "",
    active: initial?.active ?? true,
  }));
  const { busy, run } = useSubmit(onDone);
  const set =
    (k: "medicine" | "dosage" | "frequency" | "timeOfDay" | "instructions" | "startDate" | "endDate" | "planId") =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((p) => ({ ...p, [k]: e.target.value }));

  async function submit() {
    const payload = { ...form, planId: form.planId || null };
    const done = initial
      ? await run(() => api("PATCH", `/api/medication-doses/${initial.id}`, payload), "Dose updated")
      : await run(() => api("POST", "/api/medication-doses", { ...payload, clientId }), "Dose added to the plan");
    if (done) onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? "Edit dose" : "Add a dose / medication"}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button onClick={submit} loading={busy} icon={<Pill className="h-4 w-4" />} type="button">
            Save
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Medicine">
          <Input value={form.medicine} onChange={set("medicine")} placeholder="Metformin 500mg" />
        </Field>
        <Field label="Dosage">
          <Input value={form.dosage} onChange={set("dosage")} placeholder="1 tablet" />
        </Field>
        <Field label="Frequency">
          <Input value={form.frequency} onChange={set("frequency")} placeholder="Twice daily" />
        </Field>
        <Field label="Time of day">
          <Select value={form.timeOfDay ?? ""} onChange={set("timeOfDay")}>
            {DOSE_TIMES.map((t) => (
              <option key={t} value={t}>
                {TIME_LABELS[t]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Linked plan">
          <Select value={form.planId ?? ""} onChange={set("planId")}>
            <option value="">No plan</option>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Status">
          <Select
            value={form.active ? "1" : "0"}
            onChange={(e) => setForm((p) => ({ ...p, active: e.target.value === "1" }))}
          >
            <option value="1">Active</option>
            <option value="0">Stopped</option>
          </Select>
        </Field>
        <Field label="Start date">
          <Input type="date" value={form.startDate ?? ""} onChange={set("startDate")} />
        </Field>
        <Field label="End date">
          <Input type="date" value={form.endDate ?? ""} onChange={set("endDate")} />
        </Field>
        <Field label="Instructions" className="sm:col-span-2">
          <Textarea value={form.instructions ?? ""} onChange={set("instructions")} />
        </Field>
      </div>
    </Modal>
  );
}

export function DietPlanForm({
  open,
  onClose,
  onDone,
  clientId,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  onDone: () => Promise<void>;
  clientId: string;
  initial?: DietPlanDTO | null;
}) {
  const [form, setForm] = useState(() => ({
    title: initial?.title ?? "",
    dailyCalories: initial?.dailyCalories?.toString() ?? "1600",
    notes: initial?.notes ?? "",
    startDate: initial?.startDate ?? new Date().toISOString().slice(0, 10),
    endDate: initial?.endDate ?? "",
    status: initial?.status ?? "active",
  }));
  const { busy, run } = useSubmit(onDone);
  const set =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((p) => ({ ...p, [k]: e.target.value }));

  async function submit() {
    const payload = { ...form, dailyCalories: Number(form.dailyCalories) };
    const done = initial
      ? await run(() => api("PATCH", `/api/diet-plans/${initial.id}`, payload), "Diet plan updated")
      : await run(() => api("POST", "/api/diet-plans", { ...payload, clientId }), "Diet plan saved");
    if (done) onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? "Edit diet plan" : "New diet plan"}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button onClick={submit} loading={busy} icon={<Salad className="h-4 w-4" />} type="button">
            Save
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Plan name" className="sm:col-span-2">
          <Input value={form.title} onChange={set("title")} placeholder="1500 kcal plan — week 1" />
        </Field>
        <Field label="Daily calories">
          <Input type="number" value={form.dailyCalories} onChange={set("dailyCalories")} />
        </Field>
        <Field label="Status">
          <Select value={form.status} onChange={set("status")}>
            {PLAN_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Start date">
          <Input type="date" value={form.startDate} onChange={set("startDate")} />
        </Field>
        <Field label="End date">
          <Input type="date" value={form.endDate} onChange={set("endDate")} />
        </Field>
        <Field label="Notes" className="sm:col-span-2">
          <Textarea value={form.notes} onChange={set("notes")} />
        </Field>
      </div>
    </Modal>
  );
}

export function MealForm({
  open,
  onClose,
  onDone,
  dietPlanId,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  onDone: () => Promise<void>;
  dietPlanId: string;
  initial?: MealDTO | null;
}) {
  const [form, setForm] = useState(() => ({
    name: initial?.name ?? "",
    timeOfDay: initial?.timeOfDay ?? "breakfast",
    items: initial?.items ?? "",
    calories: initial?.calories?.toString() ?? "",
    dayIndex: String(initial?.dayIndex ?? 1),
  }));
  const { busy, run } = useSubmit(onDone);
  const set =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((p) => ({ ...p, [k]: e.target.value }));

  async function submit() {
    const payload = { ...form, calories: form.calories ? Number(form.calories) : null, dayIndex: Number(form.dayIndex) };
    const done = initial
      ? await run(() => api("PATCH", `/api/diet-meals/${initial.id}`, payload), "Meal updated")
      : await run(() => api("POST", "/api/diet-meals", { ...payload, dietPlanId }), "Meal added");
    if (done) onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? "Edit meal" : "Add a meal to the plan"}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button onClick={submit} loading={busy} icon={<UtensilsCrossed className="h-4 w-4" />} type="button">
            Save
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Meal name">
          <Input value={form.name} onChange={set("name")} placeholder="Lunch" />
        </Field>
        <Field label="Time">
          <Select value={form.timeOfDay} onChange={set("timeOfDay")}>
            {MEAL_TIMES.map((t) => (
              <option key={t} value={t}>
                {TIME_LABELS[t]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Day in the plan">
          <Input type="number" min={1} value={form.dayIndex} onChange={set("dayIndex")} />
        </Field>
        <Field label="Calories">
          <Input type="number" value={form.calories} onChange={set("calories")} />
        </Field>
        <Field label="Ingredients" className="sm:col-span-2">
          <Textarea
            value={form.items ?? ""}
            onChange={set("items")}
            placeholder="150g grilled chicken breast + brown rice + salad"
          />
        </Field>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* cards                                                               */
/* ------------------------------------------------------------------ */

export function RecordCard({
  record,
  canEdit,
  onEdit,
  onDelete,
}: {
  record: RecordDTO;
  canEdit: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-display text-sm font-bold text-ink">{record.title}</h4>
            <Badge tone="pine">{fmtDate(record.visitDate)}</Badge>
          </div>
          <p className="mt-1 text-[11px] text-ink/50">
            {record.doctorName ?? "No doctor"} · added {fmtShortDate(record.createdAt)}
          </p>
        </div>
        {canEdit ? (
          <div className="flex gap-1">
            <button
              type="button"
              onClick={onEdit}
              className="rounded-lg p-1.5 text-ink/45 hover:bg-sand-100 hover:text-iris-600"
              aria-label="Edit"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="rounded-lg p-1.5 text-ink/45 hover:bg-berry-100 hover:text-berry-600"
              aria-label="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ) : null}
      </div>

      {record.diagnosis ? (
        <p className="mt-3 rounded-xl bg-sand-100 px-3 py-2 text-xs leading-6 text-ink/75">
          <span className="font-semibold text-ink">Diagnosis: </span>
          {record.diagnosis}
        </p>
      ) : null}
      {record.symptoms ? (
        <p className="mt-2 text-xs leading-6 text-ink/65">
          <span className="font-semibold text-ink/80">Symptoms: </span>
          {record.symptoms}
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        {record.bloodPressure ? <Badge tone="berry">BP {record.bloodPressure}</Badge> : null}
        {record.heartRate ? <Badge tone="clay">HR {record.heartRate}</Badge> : null}
        {record.temperature ? <Badge tone="neutral">Temp {record.temperature}°</Badge> : null}
        {record.weightKg ? <Badge tone="moss">Weight {record.weightKg} kg</Badge> : null}
      </div>
      {record.notes ? <p className="mt-3 text-xs leading-6 text-ink/60">{record.notes}</p> : null}
    </Card>
  );
}

export function PlanCard({
  plan,
  doses,
  doseLogs,
  canEdit,
  canLog,
  onEdit,
  onDelete,
  onAddDose,
  onEditDose,
  onDeleteDose,
  onLogDose,
  onSessionDone,
}: {
  plan: PlanDTO;
  doses: DoseDTO[];
  doseLogs: DoseLogDTO[];
  canEdit: boolean;
  canLog?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onAddDose?: () => void;
  onEditDose?: (dose: DoseDTO) => void;
  onDeleteDose?: (dose: DoseDTO) => void;
  onLogDose?: (dose: DoseDTO) => void;
  onSessionDone?: () => void;
}) {
  const today = new Date().toDateString();
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-ink/8 px-4 py-3.5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-display text-sm font-bold text-ink">{plan.title}</h4>
            <Badge tone={STATUS_TONES[plan.status] ?? "neutral"}>{STATUS_LABELS[plan.status] ?? plan.status}</Badge>
          </div>
          <p className="mt-1 text-[11px] text-ink/50">
            {plan.startDate ? `${fmtShortDate(plan.startDate)} → ${plan.endDate ? fmtShortDate(plan.endDate) : "open ended"}` : "No period set"}
            {plan.doctorName ? ` · ${plan.doctorName}` : ""}
          </p>
        </div>
        {canEdit ? (
          <div className="flex gap-1">
            <Button size="sm" variant="soft" onClick={onEdit} icon={<Pencil className="h-3.5 w-3.5" />} type="button">
              Edit
            </Button>
            <button
              type="button"
              onClick={onDelete}
              className="rounded-lg p-1.5 text-ink/45 hover:bg-berry-100 hover:text-berry-600"
              aria-label="Delete plan"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ) : null}
      </div>

      <div className="space-y-4 px-4 py-3.5">
        {plan.description ? <p className="text-xs leading-6 text-ink/70">{plan.description}</p> : null}

        <div>
          <div className="mb-1.5 flex items-center justify-between text-[11px] text-ink/55">
            <span>Sessions</span>
            <span className="num font-semibold text-ink">
              {plan.sessionsDone}/{plan.sessionsTotal}
            </span>
          </div>
          <Progress value={plan.sessionsDone} total={plan.sessionsTotal} />
          {canEdit && onSessionDone ? (
            <Button size="sm" variant="outline" className="mt-2" onClick={onSessionDone} icon={<Check className="h-3.5 w-3.5" />} type="button">
              Log a completed session
            </Button>
          ) : null}
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[11px] font-semibold tracking-wide text-ink/55">Doses & medication</p>
            {canEdit && onAddDose ? (
              <button
                type="button"
                onClick={onAddDose}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-iris-600 hover:underline"
              >
                <Plus className="h-3.5 w-3.5" /> Add dose
              </button>
            ) : null}
          </div>
          {doses.length === 0 ? (
            <p className="rounded-xl bg-sand-100 px-3 py-2 text-[11px] text-ink/50">No doses linked to this plan</p>
          ) : (
            <ul className="space-y-2">
              {doses.map((dose) => {
                const loggedToday = doseLogs.some(
                  (l) => l.doseId === dose.id && new Date(l.takenAt).toDateString() === today,
                );
                return (
                  <li key={dose.id} className="rounded-xl border border-ink/8 bg-white px-3 py-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold text-ink">
                          {dose.medicine}
                          {!dose.active ? <span className="ms-2 text-[10px] text-ink/45">(stopped)</span> : null}
                        </p>
                        <p className="mt-0.5 text-[11px] text-ink/55">
                          {[dose.dosage, dose.frequency, dose.timeOfDay ? TIME_LABELS[dose.timeOfDay] ?? dose.timeOfDay : null]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        {canLog && onLogDose ? (
                          <Button size="sm" variant={loggedToday ? "soft" : "primary"} onClick={() => onLogDose(dose)} type="button">
                            {loggedToday ? "Taken today" : "Log dose"}
                          </Button>
                        ) : null}
                        {canEdit && onEditDose ? (
                          <button
                            type="button"
                            onClick={() => onEditDose(dose)}
                            className="rounded-lg p-1.5 text-ink/40 hover:bg-sand-100 hover:text-iris-600"
                            aria-label="Edit dose"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        ) : null}
                        {canEdit && onDeleteDose ? (
                          <button
                            type="button"
                            onClick={() => onDeleteDose(dose)}
                            className="rounded-lg p-1.5 text-ink/40 hover:bg-berry-100 hover:text-berry-600"
                            aria-label="Delete dose"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        ) : null}
                      </div>
                    </div>
                    {dose.instructions ? <p className="mt-1.5 text-[11px] text-ink/55">{dose.instructions}</p> : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </Card>
  );
}

export function DietCard({
  plan,
  meals,
  canEdit,
  onEdit,
  onDelete,
  onAddMeal,
  onEditMeal,
  onDeleteMeal,
}: {
  plan: DietPlanDTO;
  meals: MealDTO[];
  canEdit: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onAddMeal?: () => void;
  onEditMeal?: (meal: MealDTO) => void;
  onDeleteMeal?: (meal: MealDTO) => void;
}) {
  const days = useMemo(() => [...new Set(meals.map((m) => m.dayIndex))].sort((a, b) => a - b), [meals]);
  const total = meals.reduce((sum, m) => sum + (m.calories ?? 0), 0);

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-ink/8 bg-moss-100/40 px-4 py-3.5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Salad className="h-4 w-4 text-moss-500" />
            <h4 className="font-display text-sm font-bold text-ink">{plan.title}</h4>
            <Badge tone={STATUS_TONES[plan.status] ?? "neutral"}>{STATUS_LABELS[plan.status] ?? plan.status}</Badge>
          </div>
          <p className="num mt-1 text-[11px] text-ink/55">
            {plan.dailyCalories ? `${plan.dailyCalories} kcal/day` : ""} · {days.length} day{days.length === 1 ? "" : "s"} ·{" "}
            {meals.length} meals · {total} kcal listed
          </p>
        </div>
        {canEdit ? (
          <div className="flex gap-1">
            <Button size="sm" variant="soft" onClick={onAddMeal} icon={<Plus className="h-3.5 w-3.5" />} type="button">
              Meal
            </Button>
            <Button size="sm" variant="outline" onClick={onEdit} icon={<Pencil className="h-3.5 w-3.5" />} type="button">
              Edit
            </Button>
            <button
              type="button"
              onClick={onDelete}
              className="rounded-lg p-1.5 text-ink/45 hover:bg-berry-100 hover:text-berry-600"
              aria-label="Delete plan"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ) : null}
      </div>

      <div className="space-y-3 px-4 py-3.5">
        {plan.notes ? <p className="text-xs leading-6 text-ink/70">{plan.notes}</p> : null}
        {days.length === 0 ? (
          <p className="rounded-xl bg-sand-100 px-3 py-3 text-[11px] text-ink/55">No meals added to this plan yet.</p>
        ) : (
          days.map((dayIdx) => (
            <div key={dayIdx}>
              <p className="mb-1.5 text-[11px] font-bold tracking-wide text-iris-600">Day {dayIdx}</p>
              <ul className="grid gap-2 sm:grid-cols-2">
                {meals
                  .filter((m) => m.dayIndex === dayIdx)
                  .map((meal) => (
                    <li key={meal.id} className="rounded-xl border border-ink/8 bg-white px-3 py-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-ink">
                            {TIME_LABELS[meal.timeOfDay] ?? meal.timeOfDay} · {meal.name}
                          </p>
                          {meal.items ? <p className="mt-1 text-[11px] leading-5 text-ink/60">{meal.items}</p> : null}
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {meal.calories ? (
                            <span className="num text-[11px] font-semibold text-moss-500">{meal.calories}</span>
                          ) : null}
                          {canEdit ? (
                            <>
                              <button
                                type="button"
                                onClick={() => onEditMeal?.(meal)}
                                className="rounded p-1 text-ink/35 hover:text-iris-600"
                                aria-label="Edit meal"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteMeal?.(meal)}
                                className="rounded p-1 text-ink/35 hover:text-berry-600"
                                aria-label="Delete meal"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </>
                          ) : null}
                        </div>
                      </div>
                    </li>
                  ))}
              </ul>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* client file (drawer)                                                */
/* ------------------------------------------------------------------ */

export function ClientFile({
  open,
  onClose,
  onDone,
  data,
  client,
  canEdit,
  canLogDose = false,
  onNewAppointment,
  onEditAppointment,
  onAppointmentStatus,
}: {
  open: boolean;
  onClose: () => void;
  onDone: () => Promise<void>;
  data: Bootstrap;
  client: ProfileDTO;
  canEdit: boolean;
  canLogDose?: boolean;
  onNewAppointment?: (clientId: string) => void;
  onEditAppointment?: (appt: AppointmentDTO) => void;
  onAppointmentStatus?: (appt: AppointmentDTO, status: string) => void;
}) {
  const [tab, setTab] = useState<"overview" | "appointments" | "records" | "plans" | "diet">("overview");
  const [recordModal, setRecordModal] = useState<{ open: boolean; record?: RecordDTO | null }>({ open: false });
  const [planModal, setPlanModal] = useState<{ open: boolean; plan?: PlanDTO | null }>({ open: false });
  const [doseModal, setDoseModal] = useState<{ open: boolean; dose?: DoseDTO | null }>({ open: false });
  const [dietModal, setDietModal] = useState<{ open: boolean; diet?: DietPlanDTO | null }>({ open: false });
  const [mealModal, setMealModal] = useState<{ open: boolean; meal?: MealDTO | null; planId: string }>({
    open: false,
    planId: "",
  });
  const { run } = useSubmit(onDone);

  const appointments = data.appointments.filter((a) => a.clientId === client.id);
  const records = data.records.filter((r) => r.clientId === client.id);
  const plans = data.plans.filter((p) => p.clientId === client.id);
  const diets = data.dietPlans.filter((d) => d.clientId === client.id);
  const doses = data.doses.filter((d) => d.clientId === client.id);
  const meals = data.meals.filter((m) => m.clientId === client.id);
  const doseLogs = data.doseLogs.filter((l) => l.clientId === client.id);
  const assignment = data.assignments.find((a) => a.clientId === client.id);
  const value = bmi(client.heightCm, client.weightKg);

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "appointments", label: `Appointments (${appointments.length})` },
    { id: "records", label: `Records (${records.length})` },
    { id: "plans", label: `Treatment (${plans.length})` },
    { id: "diet", label: `Nutrition (${diets.length})` },
  ] as const;

  async function remove(resource: string, id: string, label: string) {
    if (!window.confirm(`Delete this ${label}? This cannot be undone.`)) return;
    await run(() => api("DELETE", `/api/${resource}/${id}`), `${label} deleted`);
  }

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        wide
        title={client.fullName}
        subtitle={`${client.email} · ${assignment ? `Responsible doctor: ${assignment.doctorName}` : "No doctor assigned"}`}
        footer={
          canEdit ? (
            <div className="flex w-full flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] text-ink/45">Every change is recorded under your name and the client is notified</span>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => setPlanModal({ open: true })} icon={<ClipboardList className="h-3.5 w-3.5" />} type="button">
                  Treatment plan
                </Button>
                <Button size="sm" variant="outline" onClick={() => setDietModal({ open: true })} icon={<Salad className="h-3.5 w-3.5" />} type="button">
                  Diet plan
                </Button>
                <Button size="sm" variant="outline" onClick={() => setRecordModal({ open: true })} icon={<Stethoscope className="h-3.5 w-3.5" />} type="button">
                  Medical record
                </Button>
                {onNewAppointment ? (
                  <Button size="sm" onClick={() => onNewAppointment(client.id)} type="button">
                    New appointment
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null
        }
      >
        <div className="mb-4 flex flex-wrap gap-1.5 rounded-xl bg-sand-100 p-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-lg px-3 py-1.5 text-[12px] font-semibold transition ${
                tab === t.id ? "bg-white text-iris-700 shadow-sm" : "text-ink/55 hover:text-ink"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "overview" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-ink/8 bg-white p-4 sm:col-span-2">
              <div className="flex items-center gap-3">
                <Avatar name={client.fullName} hue={client.avatarHue} size={54} />
                <div>
                  <p className="font-display text-base font-bold text-ink">{client.fullName}</p>
                  <p className="text-xs text-ink/55">
                    {client.phone ?? "No phone"} · {client.gender === "male" ? "Male" : "Female"} ·{" "}
                    {client.birthDate ? fmtDate(client.birthDate) : "No date of birth"}
                  </p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  { label: "Height", value: client.heightCm ? `${client.heightCm} cm` : "—" },
                  { label: "Weight", value: client.weightKg ? `${client.weightKg} kg` : "—" },
                  { label: "Target", value: client.targetWeightKg ? `${client.targetWeightKg} kg` : "—" },
                  { label: "BMI", value: value ? `${value} (${bmiLabel(value)})` : "—" },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl bg-sand-100 px-3 py-2">
                    <p className="text-[10px] text-ink/50">{item.label}</p>
                    <p className="num mt-0.5 text-[13px] font-bold text-ink">{item.value}</p>
                  </div>
                ))}
              </div>
              {client.allergies || client.medicalNotes || client.bloodType ? (
                <div className="mt-3 space-y-1.5 text-xs text-ink/70">
                  {client.bloodType ? <p>Blood type: {client.bloodType}</p> : null}
                  {client.allergies ? <p>Allergies: {client.allergies}</p> : null}
                  {client.medicalNotes ? <p>Notes: {client.medicalNotes}</p> : null}
                </div>
              ) : null}
            </div>

            <div className="rounded-2xl border border-ink/8 bg-white p-4">
              <p className="text-[11px] font-semibold tracking-wide text-ink/50">Latest appointments</p>
              {appointments.slice(0, 3).map((a) => (
                <div key={a.id} className="mt-2 flex items-center justify-between gap-2 border-b border-ink/5 pb-2 last:border-0">
                  <span className="text-xs text-ink/75">{fmtDateTime(a.scheduledAt)}</span>
                  <Badge tone={STATUS_TONES[a.status] ?? "neutral"}>{STATUS_LABELS[a.status] ?? a.status}</Badge>
                </div>
              ))}
              {appointments.length === 0 ? <p className="mt-2 text-xs text-ink/45">No appointments</p> : null}
            </div>

            <div className="rounded-2xl border border-ink/8 bg-white p-4">
              <p className="text-[11px] font-semibold tracking-wide text-ink/50">Active plans</p>
              {[...plans, ...diets].slice(0, 4).map((p) => (
                <div key={p.id} className="mt-2 flex items-center justify-between gap-2 border-b border-ink/5 pb-2 last:border-0">
                  <span className="truncate text-xs text-ink/75">{p.title}</span>
                  <Badge tone={STATUS_TONES[p.status] ?? "neutral"}>{STATUS_LABELS[p.status] ?? p.status}</Badge>
                </div>
              ))}
              {plans.length + diets.length === 0 ? <p className="mt-2 text-xs text-ink/45">No plans</p> : null}
            </div>
          </div>
        ) : null}

        {tab === "appointments" ? (
          <div className="space-y-2">
            {appointments.length === 0 ? (
              <EmptyState title="No appointments for this client" hint={canEdit ? "Use “New appointment” below" : undefined} />
            ) : (
              appointments.map((a) => (
                <div
                  key={a.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink/8 bg-white px-3.5 py-3"
                >
                  <div>
                    <p className="text-[13px] font-semibold text-ink">{fmtDateTime(a.scheduledAt)}</p>
                    <p className="mt-0.5 text-[11px] text-ink/55">
                      {a.kind} · {a.durationMin} min · {a.location ?? "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={STATUS_TONES[a.status] ?? "neutral"}>{STATUS_LABELS[a.status] ?? a.status}</Badge>
                    {canEdit && onAppointmentStatus ? (
                      <Select
                        value={a.status}
                        className="!w-auto !py-1.5 !text-xs"
                        onChange={(e) => onAppointmentStatus(a, e.target.value)}
                      >
                        {["scheduled", "completed", "cancelled", "no_show"].map((s) => (
                          <option key={s} value={s}>
                            {STATUS_LABELS[s]}
                          </option>
                        ))}
                      </Select>
                    ) : null}
                    {canEdit && onEditAppointment ? (
                      <button
                        type="button"
                        onClick={() => onEditAppointment(a)}
                        className="rounded-lg p-1.5 text-ink/45 hover:bg-sand-100 hover:text-iris-600"
                        aria-label="Edit appointment"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        ) : null}

        {tab === "records" ? (
          <div className="space-y-3">
            {canEdit ? (
              <Button size="sm" variant="soft" onClick={() => setRecordModal({ open: true })} icon={<Plus className="h-3.5 w-3.5" />} type="button">
                New medical record
              </Button>
            ) : null}
            {records.length === 0 ? (
              <EmptyState title="No medical records" />
            ) : (
              records.map((r) => (
                <RecordCard
                  key={r.id}
                  record={r}
                  canEdit={canEdit}
                  onEdit={() => setRecordModal({ open: true, record: r })}
                  onDelete={() => remove("medical-records", r.id, "medical record")}
                />
              ))
            )}
          </div>
        ) : null}

        {tab === "plans" ? (
          <div className="space-y-3">
            {canEdit ? (
              <div className="flex gap-2">
                <Button size="sm" variant="soft" onClick={() => setPlanModal({ open: true })} icon={<Plus className="h-3.5 w-3.5" />} type="button">
                  Treatment plan
                </Button>
                <Button size="sm" variant="outline" onClick={() => setDoseModal({ open: true })} icon={<Pill className="h-3.5 w-3.5" />} type="button">
                  Standalone dose
                </Button>
              </div>
            ) : null}
            {plans.length === 0 ? (
              <EmptyState title="No treatment plans" />
            ) : (
              plans.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  doses={doses.filter((d) => d.planId === plan.id)}
                  doseLogs={doseLogs}
                  canEdit={canEdit}
                  canLog={canLogDose}
                  onEdit={() => setPlanModal({ open: true, plan })}
                  onDelete={() => remove("treatment-plans", plan.id, "treatment plan")}
                  onAddDose={() => setDoseModal({ open: true })}
                  onEditDose={(dose) => setDoseModal({ open: true, dose })}
                  onDeleteDose={(dose) => remove("medication-doses", dose.id, "dose")}
                  onLogDose={(dose) => void run(() => api("POST", "/api/dose-logs", { doseId: dose.id }), "Dose logged")}
                  onSessionDone={() =>
                    void run(
                      () => api("PATCH", `/api/treatment-plans/${plan.id}`, { sessionsDone: plan.sessionsDone + 1 }),
                      "Session logged",
                    )
                  }
                />
              ))
            )}
            {canEdit && doses.filter((d) => !d.planId).length > 0 ? (
              <Card className="p-4">
                <p className="mb-2 text-[11px] font-semibold text-ink/55">Doses not linked to a plan</p>
                <ul className="space-y-2">
                  {doses
                    .filter((d) => !d.planId)
                    .map((d) => (
                      <li key={d.id} className="flex items-center justify-between gap-2 rounded-lg bg-sand-100 px-3 py-2 text-xs">
                        <span className="font-semibold text-ink">{d.medicine}</span>
                        <span className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => setDoseModal({ open: true, dose: d })}
                            className="rounded p-1 text-ink/40 hover:text-iris-600"
                            aria-label="Edit"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => remove("medication-doses", d.id, "dose")}
                            className="rounded p-1 text-ink/40 hover:text-berry-600"
                            aria-label="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </span>
                      </li>
                    ))}
                </ul>
              </Card>
            ) : null}
          </div>
        ) : null}

        {tab === "diet" ? (
          <div className="space-y-3">
            {canEdit ? (
              <Button size="sm" variant="soft" onClick={() => setDietModal({ open: true })} icon={<Plus className="h-3.5 w-3.5" />} type="button">
                New diet plan
              </Button>
            ) : null}
            {diets.length === 0 ? (
              <EmptyState title="No diet plans" />
            ) : (
              diets.map((diet) => (
                <DietCard
                  key={diet.id}
                  plan={diet}
                  meals={meals.filter((m) => m.dietPlanId === diet.id)}
                  canEdit={canEdit}
                  onEdit={() => setDietModal({ open: true, diet })}
                  onDelete={() => remove("diet-plans", diet.id, "diet plan")}
                  onAddMeal={() => setMealModal({ open: true, planId: diet.id })}
                  onEditMeal={(meal) => setMealModal({ open: true, planId: diet.id, meal })}
                  onDeleteMeal={(meal) => remove("diet-meals", meal.id, "meal")}
                />
              ))
            )}
          </div>
        ) : null}
      </Modal>

      {recordModal.open ? (
        <RecordForm
          open
          clientId={client.id}
          initial={recordModal.record ?? null}
          onClose={() => setRecordModal({ open: false })}
          onDone={onDone}
        />
      ) : null}
      {planModal.open ? (
        <PlanForm
          open
          clientId={client.id}
          initial={planModal.plan ?? null}
          onClose={() => setPlanModal({ open: false })}
          onDone={onDone}
        />
      ) : null}
      {doseModal.open ? (
        <DoseForm
          open
          clientId={client.id}
          plans={plans}
          initial={doseModal.dose ?? null}
          onClose={() => setDoseModal({ open: false })}
          onDone={onDone}
        />
      ) : null}
      {dietModal.open ? (
        <DietPlanForm
          open
          clientId={client.id}
          initial={dietModal.diet ?? null}
          onClose={() => setDietModal({ open: false })}
          onDone={onDone}
        />
      ) : null}
      {mealModal.open ? (
        <MealForm
          open
          dietPlanId={mealModal.planId}
          initial={mealModal.meal ?? null}
          onClose={() => setMealModal({ open: false, planId: "" })}
          onDone={onDone}
        />
      ) : null}
    </>
  );
}

export function AppointmentRow({
  appt,
  showClient,
  showDoctor,
  canEdit,
  onEdit,
  onCancel,
  onComplete,
  onConfirm,
  onNotConfirm,
  onReschedule,
  onClientReschedule,
  onDelete,
}: {
  appt: AppointmentDTO;
  showClient?: boolean;
  showDoctor?: boolean;
  canEdit: boolean;
  onEdit?: () => void;
  onCancel?: () => void;
  onComplete?: () => void;
  onConfirm?: () => void;
  onNotConfirm?: () => void;
  onReschedule?: () => void;
  onClientReschedule?: () => void;
  onDelete?: () => void;
}) {
  const past = new Date(appt.scheduledAt).getTime() < Date.now();
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/6 px-4 py-3 last:border-0">
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-[11px] font-bold ${
            past ? "bg-sand-100 text-ink/50" : "bg-iris-50 text-iris-700"
          }`}
        >
          <span className="num leading-tight">{fmtTime(appt.scheduledAt)}</span>
        </span>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-ink">
            {showClient ? appt.clientName : appt.kind}
            {showDoctor ? <span className="ms-2 text-[11px] font-normal text-ink/50">{appt.doctorName}</span> : null}
          </p>
          <p className="mt-0.5 truncate text-[11px] text-ink/55">
            {fmtDate(appt.scheduledAt)} · {appt.durationMin} min · {appt.location ?? "—"}
            {showClient ? ` · ${appt.kind}` : ""}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge tone={STATUS_TONES[appt.status] ?? "neutral"}>{STATUS_LABELS[appt.status] ?? appt.status}</Badge>
        {canEdit ? (
          <>
            {appt.status === "pending_doctor" && onConfirm ? (
              <Button size="sm" variant="primary" onClick={onConfirm} type="button">
                Confirm
              </Button>
            ) : null}
            {appt.status === "pending_doctor" && onNotConfirm ? (
              <Button size="sm" variant="outline" onClick={onNotConfirm} type="button">
                Not confirm
              </Button>
            ) : null}
            {appt.status === "pending_doctor" && onReschedule ? (
              <Button size="sm" variant="soft" onClick={onReschedule} type="button">
                Request reschedule
              </Button>
            ) : null}
            {onClientReschedule && ["scheduled", "pending_client", "not_confirmed"].includes(appt.status) ? (
              <Button size="sm" variant="soft" onClick={onClientReschedule} type="button">
                Request reschedule
              </Button>
            ) : null}
            {appt.status === "pending_client" && onConfirm ? (
              <Button size="sm" variant="primary" onClick={onConfirm} type="button">
                Confirm new time
              </Button>
            ) : null}
            {appt.status === "scheduled" && onComplete ? (
              <Button size="sm" variant="soft" onClick={onComplete} type="button">
                Complete
              </Button>
            ) : null}
            {["scheduled", "pending_doctor", "pending_client"].includes(appt.status) && onCancel ? (
              <Button size="sm" variant="outline" onClick={onCancel} type="button">
                Cancel
              </Button>
            ) : null}
            {onEdit ? (
              <button
                type="button"
                onClick={onEdit}
                className="rounded-lg p-1.5 text-ink/45 hover:bg-sand-100 hover:text-iris-600"
                aria-label="Edit appointment"
              >
                <Pencil className="h-4 w-4" />
              </button>
            ) : null}
            {onDelete ? (
              <button
                type="button"
                onClick={onDelete}
                className="rounded-lg p-1.5 text-ink/45 hover:bg-berry-100 hover:text-berry-600"
                aria-label="Delete appointment"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
