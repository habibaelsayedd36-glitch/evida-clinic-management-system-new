"use client";

import { useMemo, useState } from "react";
import {
  Bell,
  CalendarDays,
  CalendarPlus,
  ClipboardList,
  FilePlus2,
  LayoutDashboard,
  Pill,
  Salad,
  Search,
  Stethoscope,
  Trash2,
  Users,
  Pencil,
  Activity,
  Wallet,
} from "lucide-react";
import { api, bmi, bmiLabel, currency, fmtDate, fmtRelative, fmtShortDate, isSameDay, useBootstrap } from "@/lib/client";
import {
  STATUS_LABELS,
  type AppointmentDTO,
  type Bootstrap,
  type DietPlanDTO,
  type DoseDTO,
  type MealDTO,
  type PlanDTO,
  type ProfileDTO,
  type RecordDTO,
} from "@/lib/types";
import { Avatar, Badge, Button, Card, EmptyState, Modal, SearchInput, SectionHeader, StatTile } from "@/components/ui";
import { Shell, type NavItem } from "@/components/Shell";
import { AppointmentForm, NotificationForm, useSubmit } from "@/components/forms";
import {
  AppointmentRow,
  ClientFile,
  DietCard,
  DietPlanForm,
  DoseForm,
  MealForm,
  PlanCard,
  PlanForm,
  RecordCard,
  RecordForm,
} from "@/components/clinical";

const NAV: NavItem[] = [
  { id: "today", label: "My day", icon: LayoutDashboard },
  { id: "clients", label: "My clients", icon: Users },
  { id: "appointments", label: "Appointments", icon: CalendarDays },
  { id: "plans", label: "Treatment plans", icon: ClipboardList },
  { id: "diet", label: "Diet plans", icon: Salad },
  { id: "records", label: "Medical records", icon: Stethoscope },
  { id: "notifications", label: "Notifications", icon: Bell },
];

const TITLES: Record<string, { title: string; subtitle: string }> = {
  today: { title: "Your day at the clinic", subtitle: "Today's appointments and the follow-ups your clients need" },
  clients: {
    title: "My clients",
    subtitle: "Only the clients linked to you — other doctors' clients are never visible here",
  },
  appointments: { title: "Appointments", subtitle: "Book and manage appointments for your clients" },
  plans: { title: "Treatment plans", subtitle: "Plans, doses and session completion tracking" },
  diet: { title: "Diet plans", subtitle: "Plans and meals for your clients" },
  records: { title: "Medical records", subtitle: "Diagnosis and measurements per visit" },
  notifications: { title: "Notifications", subtitle: "Your inbox plus sending messages to your clients" },
};

type PendingForm = { kind: "record" | "plan" | "dose" | "diet" } | null;

export function DoctorApp({ initial }: { initial: Bootstrap }) {
  const { data, refresh, loading } = useBootstrap(initial);
  const { run } = useSubmit(refresh);
  const [view, setView] = useState("today");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");

  const [fileClient, setFileClient] = useState<ProfileDTO | null>(null);
  const [apptModal, setApptModal] = useState<{ open: boolean; appt?: AppointmentDTO | null; clientId?: string }>({ open: false });
  const [notifModal, setNotifModal] = useState(false);
  const [picker, setPicker] = useState<PendingForm>(null);
  const [recordModal, setRecordModal] = useState<{ open: boolean; clientId: string; record?: RecordDTO | null }>({
    open: false,
    clientId: "",
  });
  const [planModal, setPlanModal] = useState<{ open: boolean; clientId: string; plan?: PlanDTO | null }>({
    open: false,
    clientId: "",
  });
  const [doseModal, setDoseModal] = useState<{ open: boolean; clientId: string; dose?: DoseDTO | null }>({
    open: false,
    clientId: "",
  });
  const [dietModal, setDietModal] = useState<{ open: boolean; clientId: string; diet?: DietPlanDTO | null }>({
    open: false,
    clientId: "",
  });
  const [mealModal, setMealModal] = useState<{ open: boolean; dietPlanId: string; meal?: MealDTO | null }>({
    open: false,
    dietPlanId: "",
  });

  const todays = data.appointments.filter((a) => isSameDay(a.scheduledAt));
  const upcoming = useMemo(
    () =>
      data.appointments
        .filter((a) => ["scheduled", "pending_doctor", "pending_client"].includes(a.status) && new Date(a.scheduledAt) >= new Date())
        .sort((a, b) => +new Date(a.scheduledAt) - +new Date(b.scheduledAt)),
    [data.appointments],
  );

  const clients = data.clients.filter(
    (c) =>
      !query ||
      c.fullName.toLowerCase().includes(query.toLowerCase()) ||
      c.email.toLowerCase().includes(query.toLowerCase()) ||
      (c.phone ?? "").includes(query),
  );

  const appointments = data.appointments.filter((a) => {
    const matchesStatus = statusFilter === "all" || a.status === statusFilter;
    const matchesClient = clientFilter === "all" || a.clientId === clientFilter;
    const matchesQuery = !query || a.clientName.toLowerCase().includes(query.toLowerCase());
    return matchesStatus && matchesClient && matchesQuery;
  });

  const visiblePlans = data.plans.filter((p) => clientFilter === "all" || p.clientId === clientFilter);
  const visibleDiets = data.dietPlans.filter((d) => clientFilter === "all" || d.clientId === clientFilter);
  const visibleRecords = data.records.filter((r) => clientFilter === "all" || r.clientId === clientFilter);

  const myRevenue = data.appointments.filter((a) => a.status === "completed").reduce((s, a) => s + (a.price ?? 0), 0);
  const activeDoses = data.doses.filter((d) => d.active);
  const adherenceToday = activeDoses.filter((d) =>
    data.doseLogs.some((l) => l.doseId === d.id && isSameDay(l.takenAt)),
  ).length;

  async function changeStatus(appt: AppointmentDTO, status: string) {
    await run(() => api("PATCH", `/api/appointments/${appt.id}`, { status }), `Status set to ${STATUS_LABELS[status]}`);
  }

  async function remove(resource: string, id: string, label: string) {
    if (!window.confirm(`Delete this ${label}?`)) return;
    await run(() => api("DELETE", `/api/${resource}/${id}`), `${label} deleted`);
  }

  function onPicked(clientId: string) {
    const pending = picker;
    setPicker(null);
    if (!pending) return;
    if (pending.kind === "record") setRecordModal({ open: true, clientId });
    if (pending.kind === "plan") setPlanModal({ open: true, clientId });
    if (pending.kind === "dose") setDoseModal({ open: true, clientId });
    if (pending.kind === "diet") setDietModal({ open: true, clientId });
  }

  return (
    <>
      <Shell
        user={data.me}
        nav={NAV.map((n) => ({
          ...n,
          count: n.id === "today" ? todays.length : n.id === "clients" ? data.clients.length : undefined,
        }))}
        active={view}
        onNavigate={(id) => {
          setView(id);
          setQuery("");
        }}
        notifications={data.notifications}
        onRefresh={refresh}
        refreshing={loading}
        title={TITLES[view].title}
        subtitle={TITLES[view].subtitle}
        headerAction={
          <Button size="sm" icon={<CalendarPlus className="h-4 w-4" />} onClick={() => setApptModal({ open: true })} type="button">
            New appointment
          </Button>
        }
      >
        {view === "today" ? (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatTile label="My clients" value={data.stats.clients} hint="Linked to you only" icon={<Users className="h-5 w-5" />} />
              <StatTile label="Appointments today" value={todays.length} hint={fmtDate(new Date().toISOString())} tone="clay" icon={<CalendarDays className="h-5 w-5" />} />
              <StatTile label="Doses logged today" value={`${adherenceToday}/${activeDoses.length}`} tone="moss" icon={<Pill className="h-5 w-5" />} />
              <StatTile label="Your revenue" value={currency(myRevenue)} hint={`${data.stats.completed} completed visits`} icon={<Wallet className="h-5 w-5" />} />
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <SectionHeader title="Today's agenda" icon={<CalendarDays className="h-4 w-4" />} />
                {todays.length === 0 ? (
                  <EmptyState
                    title="No appointments today"
                    hint="Use “New appointment” to book one for your clients"
                    icon={<CalendarDays className="h-5 w-5" />}
                  />
                ) : (
                  todays.map((a) => (
                    <AppointmentRow
                      key={a.id}
                      appt={a}
                      showClient
                      canEdit
                      onEdit={() => setApptModal({ open: true, appt: a })}
                      onComplete={() => changeStatus(a, "completed")}
                      onConfirm={a.status === "pending_doctor" ? () => changeStatus(a, "scheduled") : undefined}
                      onCancel={() => changeStatus(a, "cancelled")}
                      onDelete={() => remove("appointments", a.id, "appointment")}
                    />
                  ))
                )}
              </Card>

              <Card>
                <SectionHeader title="Up next" subtitle="Nearest scheduled appointments" icon={<Activity className="h-4 w-4" />} />
                <div className="max-h-[24rem] divide-y divide-ink/6 overflow-y-auto">
                  {upcoming.length === 0 ? (
                    <p className="px-5 py-8 text-center text-xs text-ink/45">No upcoming appointments</p>
                  ) : (
                    upcoming.slice(0, 10).map((a) => (
                      <div key={a.id} className="flex items-center justify-between gap-3 px-5 py-3">
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-semibold text-ink">{a.clientName}</p>
                          <p className="mt-0.5 text-[11px] text-ink/50">
                            {fmtShortDate(a.scheduledAt)} · {a.kind}
                          </p>
                        </div>
                        <Badge tone={isSameDay(a.scheduledAt) ? "clay" : "neutral"}>{fmtRelative(a.scheduledAt)}</Badge>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </div>

            <Card>
              <SectionHeader title="Dose adherence" subtitle="How your clients are following active doses" icon={<Pill className="h-4 w-4" />} />
              {activeDoses.length === 0 ? (
                <EmptyState title="No active doses" hint="Add a dose from a treatment plan" />
              ) : (
                <div className="grid gap-2 px-5 py-4 sm:grid-cols-2">
                  {activeDoses.slice(0, 8).map((dose) => {
                    const logs = data.doseLogs.filter((l) => l.doseId === dose.id);
                    const last = logs[0];
                    return (
                      <div key={dose.id} className="rounded-xl border border-ink/8 bg-white px-3.5 py-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-[13px] font-semibold text-ink">{dose.medicine}</p>
                          <Badge tone={logs.some((l) => isSameDay(l.takenAt)) ? "moss" : "clay"}>
                            {logs.some((l) => isSameDay(l.takenAt)) ? "Taken today" : "Not yet"}
                          </Badge>
                        </div>
                        <p className="mt-1 text-[11px] text-ink/55">
                          {dose.clientName} · {dose.frequency ?? "—"} · {logs.length} log{logs.length === 1 ? "" : "s"}
                        </p>
                        {last ? <p className="mt-0.5 text-[10px] text-ink/40">Last dose: {fmtRelative(last.takenAt)}</p> : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        ) : null}

        {view === "clients" ? (
          <Card>
            <SectionHeader
              title={`My clients (${clients.length})`}
              subtitle="Full file: measurements, appointments, records, treatment and diet plans"
              icon={<Users className="h-4 w-4" />}
            />
            <div className="border-b border-ink/8 px-5 py-3">
              <div className="relative">
                <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" />
                <SearchInput className="ps-9" placeholder="Search your clients…" value={query} onChange={(e) => setQuery(e.target.value)} />
              </div>
            </div>
            {clients.length === 0 ? (
              <EmptyState
                title="No clients"
                hint="The admin is the one who links clients to doctors"
                icon={<Users className="h-5 w-5" />}
              />
            ) : (
              <div className="grid gap-3 px-5 py-4 md:grid-cols-2 xl:grid-cols-3">
                {clients.map((c) => {
                  const value = bmi(c.heightCm, c.weightKg);
                  const next = upcoming.find((a) => a.clientId === c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setFileClient(c)}
                      className="lift rounded-2xl border border-ink/8 bg-white p-4 text-start"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar name={c.fullName} hue={c.avatarHue} size={44} />
                        <div className="min-w-0">
                          <p className="truncate font-display text-sm font-bold text-ink">{c.fullName}</p>
                          <p className="truncate text-[11px] text-ink/50">{c.phone ?? c.email}</p>
                        </div>
                      </div>
                      <div className="num mt-3 grid grid-cols-3 gap-2 text-center text-[11px]">
                        <div className="rounded-lg bg-sand-100 py-1.5">
                          <p className="font-bold text-ink">{c.weightKg ?? "—"}</p>
                          <p className="text-[9px] text-ink/50">kg</p>
                        </div>
                        <div className="rounded-lg bg-sand-100 py-1.5">
                          <p className="font-bold text-ink">{value ?? "—"}</p>
                          <p className="text-[9px] text-ink/50">BMI</p>
                        </div>
                        <div className="rounded-lg bg-sand-100 py-1.5">
                          <p className="font-bold text-ink">{data.appointments.filter((a) => a.clientId === c.id).length}</p>
                          <p className="text-[9px] text-ink/50">visits</p>
                        </div>
                      </div>
                      <p className="mt-3 truncate text-[11px] text-ink/55">
                        {next ? `Next appointment: ${fmtDate(next.scheduledAt)}` : "No upcoming appointments"}
                      </p>
                      {value ? (
                        <Badge tone="pine" className="mt-2">
                          {bmiLabel(value)}
                        </Badge>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )}
          </Card>
        ) : null}

        {view === "appointments" || view === "plans" || view === "diet" || view === "records" ? (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <select
                value={clientFilter}
                onChange={(e) => setClientFilter(e.target.value)}
                className="rounded-lg border border-ink/12 bg-white px-3 py-2 text-sm"
              >
                <option value="all">All my clients</option>
                {data.clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.fullName}
                  </option>
                ))}
              </select>
              {view === "appointments" ? (
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-lg border border-ink/12 bg-white px-3 py-2 text-sm"
                >
                  <option value="all">All statuses</option>
                  {["pending_doctor", "pending_client", "scheduled", "completed", "cancelled", "no_show"].map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              ) : null}
              <div className="relative min-w-[200px] flex-1">
                <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" />
                <SearchInput className="ps-9" placeholder="Search…" value={query} onChange={(e) => setQuery(e.target.value)} />
              </div>
            </div>

            {view === "appointments" ? (
              <Card>
                <SectionHeader
                  title={`Appointments (${appointments.length})`}
                  icon={<CalendarDays className="h-4 w-4" />}
                  action={
                    <Button size="sm" icon={<CalendarPlus className="h-4 w-4" />} onClick={() => setApptModal({ open: true })} type="button">
                      New appointment
                    </Button>
                  }
                />
                {appointments.length === 0 ? (
                  <EmptyState title="No matching appointments" icon={<CalendarDays className="h-5 w-5" />} />
                ) : (
                  appointments.map((a) => (
                    <AppointmentRow
                      key={a.id}
                      appt={a}
                      showClient
                      canEdit
                      onEdit={() => setApptModal({ open: true, appt: a })}
                      onComplete={() => changeStatus(a, "completed")}
                      onCancel={() => changeStatus(a, "cancelled")}
                      onDelete={() => remove("appointments", a.id, "appointment")}
                    />
                  ))
                )}
              </Card>
            ) : null}

            {view === "plans" ? (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" icon={<ClipboardList className="h-4 w-4" />} onClick={() => setPicker({ kind: "plan" })} type="button">
                    New treatment plan
                  </Button>
                  <Button size="sm" variant="outline" icon={<Pill className="h-4 w-4" />} onClick={() => setPicker({ kind: "dose" })} type="button">
                    Dose / medication
                  </Button>
                </div>
                {visiblePlans.length === 0 ? (
                  <Card>
                    <EmptyState title="No treatment plans" hint="Start a new plan for one of your clients" icon={<ClipboardList className="h-5 w-5" />} />
                  </Card>
                ) : (
                  visiblePlans.map((plan) => {
                    const client = data.clients.find((c) => c.id === plan.clientId);
                    return (
                      <div key={plan.id} className="space-y-2">
                        <div className="flex items-center gap-2 px-1">
                          {client ? <Avatar name={client.fullName} hue={client.avatarHue} size={26} /> : null}
                          <p className="text-xs font-semibold text-ink/70">{client?.fullName}</p>
                        </div>
                        <PlanCard
                          plan={plan}
                          doses={data.doses.filter((d) => d.planId === plan.id)}
                          doseLogs={data.doseLogs}
                          canEdit
                          onEdit={() => setPlanModal({ open: true, clientId: plan.clientId, plan })}
                          onDelete={() => remove("treatment-plans", plan.id, "plan")}
                          onAddDose={() => setDoseModal({ open: true, clientId: plan.clientId })}
                          onEditDose={(dose) => setDoseModal({ open: true, clientId: plan.clientId, dose })}
                          onDeleteDose={(dose) => remove("medication-doses", dose.id, "dose")}
                          onSessionDone={() =>
                            run(
                              () => api("PATCH", `/api/treatment-plans/${plan.id}`, { sessionsDone: plan.sessionsDone + 1 }),
                              "Session logged",
                            )
                          }
                        />
                      </div>
                    );
                  })
                )}
                {data.doses.filter((d) => !d.planId).length > 0 ? (
                  <Card>
                    <SectionHeader title="Doses without a plan" icon={<Pill className="h-4 w-4" />} />
                    <div className="divide-y divide-ink/6">
                      {data.doses
                        .filter((d) => !d.planId)
                        .map((d) => (
                          <div key={d.id} className="flex items-center justify-between gap-3 px-5 py-3">
                            <div>
                              <p className="text-[13px] font-semibold text-ink">{d.medicine}</p>
                              <p className="text-[11px] text-ink/55">
                                {d.clientName} · {d.frequency ?? "—"}
                              </p>
                            </div>
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => setDoseModal({ open: true, clientId: d.clientId, dose: d })}
                                className="rounded-lg p-1.5 text-ink/45 hover:bg-sand-100 hover:text-iris-600"
                                aria-label="Edit"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => remove("medication-doses", d.id, "dose")}
                                className="rounded-lg p-1.5 text-ink/45 hover:bg-berry-100 hover:text-berry-600"
                                aria-label="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </Card>
                ) : null}
              </div>
            ) : null}

            {view === "diet" ? (
              <div className="space-y-3">
                <Button size="sm" icon={<Salad className="h-4 w-4" />} onClick={() => setPicker({ kind: "diet" })} type="button">
                  New diet plan
                </Button>
                {visibleDiets.length === 0 ? (
                  <Card>
                    <EmptyState title="No diet plans" icon={<Salad className="h-5 w-5" />} />
                  </Card>
                ) : (
                  visibleDiets.map((diet) => (
                    <DietCard
                      key={diet.id}
                      plan={diet}
                      meals={data.meals.filter((m) => m.dietPlanId === diet.id)}
                      canEdit
                      onEdit={() => setDietModal({ open: true, clientId: diet.clientId, diet })}
                      onDelete={() => remove("diet-plans", diet.id, "diet plan")}
                      onAddMeal={() => setMealModal({ open: true, dietPlanId: diet.id })}
                      onEditMeal={(meal) => setMealModal({ open: true, dietPlanId: diet.id, meal })}
                      onDeleteMeal={(meal) => remove("diet-meals", meal.id, "meal")}
                    />
                  ))
                )}
              </div>
            ) : null}

            {view === "records" ? (
              <div className="space-y-3">
                <Button size="sm" icon={<FilePlus2 className="h-4 w-4" />} onClick={() => setPicker({ kind: "record" })} type="button">
                  New medical record
                </Button>
                {visibleRecords.length === 0 ? (
                  <Card>
                    <EmptyState title="No medical records" icon={<Stethoscope className="h-5 w-5" />} />
                  </Card>
                ) : (
                  visibleRecords.map((record) => (
                    <div key={record.id} className="space-y-1.5">
                      <p className="px-1 text-[11px] font-semibold text-ink/55">{record.clientName}</p>
                      <RecordCard
                        record={record}
                        canEdit
                        onEdit={() => setRecordModal({ open: true, clientId: record.clientId, record })}
                        onDelete={() => remove("medical-records", record.id, "record")}
                      />
                    </div>
                  ))
                )}
              </div>
            ) : null}
          </div>
        ) : null}

        {view === "notifications" ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <SectionHeader
                title="Message your clients"
                subtitle="Appointment reminder, dose alert or a diet update"
                icon={<Bell className="h-4 w-4" />}
                action={
                  <Button size="sm" onClick={() => setNotifModal(true)} type="button">
                    Custom message
                  </Button>
                }
              />
              <div className="grid gap-2 px-5 py-4">
                {data.clients.map((c) => (
                  <div key={c.id} className="flex items-center justify-between gap-3 rounded-xl border border-ink/8 bg-white px-3.5 py-2.5">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <Avatar name={c.fullName} hue={c.avatarHue} size={32} />
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold text-ink">{c.fullName}</p>
                        <p className="truncate text-[11px] text-ink/50">{c.phone ?? c.email}</p>
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      <Button
                        size="sm"
                        variant="soft"
                        onClick={() =>
                          run(
                            () =>
                              api("POST", "/api/notifications", {
                                clientId: c.id,
                                title: "Appointment reminder",
                                body: "If you need to change your appointment, call the clinic or open My Appointments.",
                                kind: "appointment",
                              }),
                            "Reminder sent",
                          )
                        }
                        type="button"
                      >
                        Appointment
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          run(
                            () =>
                              api("POST", "/api/notifications", {
                                clientId: c.id,
                                title: "Log your dose",
                                body: "Don't forget to log today's dose from the Treatment section.",
                                kind: "medication",
                              }),
                            "Alert sent",
                          )
                        }
                        type="button"
                      >
                        Dose alert
                      </Button>
                    </div>
                  </div>
                ))}
                {data.clients.length === 0 ? <EmptyState title="No clients linked to you" /> : null}
              </div>
            </Card>

            <Card>
              <SectionHeader title="Your inbox" icon={<Bell className="h-4 w-4" />} />
              {data.notifications.length === 0 ? (
                <EmptyState title="No notifications" icon={<Bell className="h-5 w-5" />} />
              ) : (
                <div className="divide-y divide-ink/6">
                  {data.notifications.map((n) => (
                    <div key={n.id} className="flex items-start gap-3 px-5 py-3.5">
                      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.readAt ? "bg-sand-300" : "bg-clay-500"}`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold text-ink">{n.title}</p>
                        {n.body ? <p className="mt-0.5 text-[11px] leading-5 text-ink/60">{n.body}</p> : null}
                        <p className="mt-1 text-[10px] text-ink/40">{fmtRelative(n.createdAt)}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={async () => {
                          await api("PATCH", `/api/notifications/${n.id}`, { read: !n.readAt });
                          await refresh();
                        }}
                        type="button"
                      >
                        {n.readAt ? "Mark unread" : "Mark read"}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        ) : null}
      </Shell>

      {picker ? (
        <Modal open onClose={() => setPicker(null)} title="Choose a client" subtitle="The action will apply to this client">
          <div className="grid gap-2">
            {data.clients.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => onPicked(c.id)}
                className="flex items-center gap-3 rounded-xl border border-ink/8 bg-white px-3.5 py-2.5 text-start transition hover:border-iris-300"
              >
                <Avatar name={c.fullName} hue={c.avatarHue} size={34} />
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-semibold text-ink">{c.fullName}</span>
                  <span className="block truncate text-[11px] text-ink/50">{c.phone ?? c.email}</span>
                </span>
              </button>
            ))}
          </div>
        </Modal>
      ) : null}

      {recordModal.open ? (
        <RecordForm
          open
          clientId={recordModal.clientId}
          initial={recordModal.record ?? null}
          onClose={() => setRecordModal({ open: false, clientId: "" })}
          onDone={refresh}
        />
      ) : null}
      {planModal.open ? (
        <PlanForm
          open
          clientId={planModal.clientId}
          initial={planModal.plan ?? null}
          onClose={() => setPlanModal({ open: false, clientId: "" })}
          onDone={refresh}
        />
      ) : null}
      {doseModal.open ? (
        <DoseForm
          open
          clientId={doseModal.clientId}
          plans={data.plans.filter((p) => p.clientId === doseModal.clientId)}
          initial={doseModal.dose ?? null}
          onClose={() => setDoseModal({ open: false, clientId: "" })}
          onDone={refresh}
        />
      ) : null}
      {dietModal.open ? (
        <DietPlanForm
          open
          clientId={dietModal.clientId}
          initial={dietModal.diet ?? null}
          onClose={() => setDietModal({ open: false, clientId: "" })}
          onDone={refresh}
        />
      ) : null}
      {mealModal.open ? (
        <MealForm
          open
          dietPlanId={mealModal.dietPlanId}
          initial={mealModal.meal ?? null}
          onClose={() => setMealModal({ open: false, dietPlanId: "" })}
          onDone={refresh}
        />
      ) : null}
      {apptModal.open ? (
        <AppointmentForm
          open
          onClose={() => setApptModal({ open: false })}
          onDone={refresh}
          clients={data.clients}
          doctors={data.doctors}
          initial={apptModal.appt ?? null}
          lockClientId={apptModal.clientId}
          canPickDoctor={false}
          defaultDoctorId={data.me.id}
        />
      ) : null}
      {notifModal ? (
        <NotificationForm open onClose={() => setNotifModal(false)} onDone={refresh} clients={data.clients} doctors={data.doctors} />
      ) : null}
      {fileClient ? (
        <ClientFile
          open
          onClose={() => setFileClient(null)}
          onDone={refresh}
          data={data}
          client={fileClient}
          canEdit
          onNewAppointment={(clientId) => setApptModal({ open: true, clientId })}
          onEditAppointment={(appt) => setApptModal({ open: true, appt })}
          onAppointmentStatus={changeStatus}
        />
      ) : null}
    </>
  );
}
