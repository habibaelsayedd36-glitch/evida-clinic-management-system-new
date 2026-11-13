"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Bell,
  CalendarDays,
  CalendarPlus,
  ClipboardList,
  LayoutDashboard,
  Link2,
  Salad,
  Stethoscope,
  Trash2,
  UserPlus,
  Users,
  Wallet,
  Activity,
  Pencil,
  Search,
  Tags,
  Target,
  TrendingUp,
  Sparkles,
} from "lucide-react";
import { api, bmi, bmiLabel, currency, fmtDate, fmtRelative, fmtShortDate, groupBy, isSameDay } from "@/lib/client";
import {
  KIND_LABELS,
  STATUS_LABELS,
  type AppointmentDTO,
  type AssignmentDTO,
  type Bootstrap,
  type ProfileDTO,
} from "@/lib/types";
import { Avatar, Badge, Bar, Button, Card, EmptyState, SearchInput, SectionHeader, StatTile, STATUS_TONES } from "@/components/ui";
import { Shell, type NavItem } from "@/components/Shell";
import { AppointmentForm, AssignmentForm, ClientForm, NotificationForm, StaffForm, useSubmit } from "@/components/forms";
import { AppointmentRow, ClientFile } from "@/components/clinical";
import { useBootstrap } from "@/lib/client";
import { OffersManager } from "@/components/admin/OffersManager";
import { BillingManager } from "@/components/admin/BillingManager";

const NAV: NavItem[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "clients", label: "Clients", icon: Users },
  { id: "doctors", label: "Doctors", icon: Stethoscope },
  { id: "assignments", label: "Assignments", icon: Link2 },
  { id: "appointments", label: "Appointments", icon: CalendarDays },
  { id: "invoices", label: "Invoices & payments", icon: Wallet },
  { id: "plans", label: "Plans", icon: ClipboardList },
  { id: "reports", label: "Reports", icon: BarChart3 },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "offers", label: "Services & Offers", icon: Tags },
];

const TITLES: Record<string, { title: string; subtitle: string }> = {
  overview: { title: "Clinic control room", subtitle: "Today at a glance plus the key numbers for the whole team" },
  clients: { title: "Client management", subtitle: "Client data, editing, deletion and linking each client to a responsible doctor" },
  doctors: { title: "Medical team", subtitle: "Doctor accounts, workload and collected revenue" },
  assignments: { title: "Client → doctor assignments", subtitle: "The link decides who can see whose data — admin only" },
  appointments: { title: "Appointments", subtitle: "Book, edit, change status and delete appointments across the clinic" },
  invoices: { title: "Invoices & payments", subtitle: "Record payments, review payment history and track outstanding balances" },
  plans: { title: "Treatment & diet plans", subtitle: "Follow every client's plans and session completion" },
  reports: { title: "Reports", subtitle: "Clinic performance in numbers — appointments, revenue and client adherence" },
  notifications: { title: "Notifications", subtitle: "Send alerts to one client, all clients or all doctors" },
  offers: { title: "Services & Offers", subtitle: "Manage clinic services, full protocol details, EGP prices and offer deadlines" },
};

export function AdminApp({ initial }: { initial: Bootstrap }) {
  const { data, refresh, loading } = useBootstrap(initial);
  const { run } = useSubmit(refresh);
  const [view, setView] = useState("overview");
  const [query, setQuery] = useState("");

  const [clientModal, setClientModal] = useState<{ open: boolean; client?: ProfileDTO | null }>({ open: false });
  const [staffModal, setStaffModal] = useState<{ open: boolean; staff?: ProfileDTO | null }>({ open: false });
  const [apptModal, setApptModal] = useState<{ open: boolean; appt?: AppointmentDTO | null; clientId?: string }>({
    open: false,
  });
  const [assignModal, setAssignModal] = useState<{ open: boolean; row?: AssignmentDTO | null; clientId?: string }>({
    open: false,
  });
  const [notifModal, setNotifModal] = useState(false);
  const [fileClient, setFileClient] = useState<ProfileDTO | null>(null);
  const [doctorFilter, setDoctorFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [monthlyGoal, setMonthlyGoal] = useState(0);
  const [goalInput, setGoalInput] = useState("");
  const [goalSaving, setGoalSaving] = useState(false);
  const [goalMessage, setGoalMessage] = useState("");
  useEffect(() => {
    let active = true;
    api<{ goal?: number }>("GET", "/api/clinic-goal")
      .then((result) => {
        if (!active) return;
        const value = Number(result.goal ?? 0);
        setMonthlyGoal(value);
        setGoalInput(value > 0 ? String(value) : "");
      })
      .catch(() => { if (active) setGoalMessage("Could not load the monthly target."); });
    return () => { active = false; };
  }, []);

  const now = new Date();
  const monthRevenue = data.invoices.reduce((sum, invoice) => sum + invoice.payments
    .filter((payment) => new Date(payment.paidAt).getFullYear() === now.getFullYear() && new Date(payment.paidAt).getMonth() === now.getMonth())
    .reduce((paid, payment) => paid + payment.amount, 0), 0);
  const goalProgress = monthlyGoal > 0 ? Math.min(100, Math.round((monthRevenue / monthlyGoal) * 100)) : 0;
  const goalRemaining = Math.max(0, monthlyGoal - monthRevenue);

  async function saveMonthlyGoal() {
    const value = Number(goalInput);
    if (!Number.isFinite(value) || value <= 0) {
      setGoalMessage("Enter a target greater than 0 EGP.");
      return;
    }
    setGoalSaving(true);
    setGoalMessage("");
    try {
      await api("POST", "/api/clinic-goal", { goal: Math.round(value) });
      setMonthlyGoal(Math.round(value));
      setGoalInput(String(Math.round(value)));
      setGoalMessage("Monthly target updated.");
    } catch {
      setGoalMessage("Could not save the target. Please try again.");
    } finally {
      setGoalSaving(false);
    }
  }

  const assignmentByClient = useMemo(() => {
    const map = new Map<string, AssignmentDTO>();
    data.assignments.forEach((a) => map.set(a.clientId, a));
    return map;
  }, [data.assignments]);

  const unassigned = data.clients.filter((c) => !assignmentByClient.has(c.id));
  const appointmentsCount = (clientId: string) => data.appointments.filter((a) => a.clientId === clientId).length;

  const filteredClients = data.clients.filter((c) => {
    const matchesQuery =
      !query ||
      c.fullName.toLowerCase().includes(query.toLowerCase()) ||
      c.email.toLowerCase().includes(query.toLowerCase()) ||
      (c.phone ?? "").includes(query);
    const matchesDoctor =
      doctorFilter === "all"
        ? true
        : doctorFilter === "none"
          ? !assignmentByClient.has(c.id)
          : assignmentByClient.get(c.id)?.doctorId === doctorFilter;
    return matchesQuery && matchesDoctor;
  });

  const filteredAppointments = data.appointments.filter((a) => {
    const matchesQuery = !query || a.clientName.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = statusFilter === "all" || a.status === statusFilter;
    const matchesDoctor = doctorFilter === "all" || a.doctorId === doctorFilter;
    return matchesQuery && matchesStatus && matchesDoctor;
  });

  const todays = data.appointments.filter((a) => isSameDay(a.scheduledAt));

  async function changeStatus(appt: AppointmentDTO, status: string) {
    await run(() => api("PATCH", `/api/appointments/${appt.id}`, { status }), `Status set to ${STATUS_LABELS[status]}`);
  }

  async function remove(resource: string, id: string, label: string) {
    if (!window.confirm(`Delete this ${label}? All linked data will be removed too.`)) return;
    await run(() => api("DELETE", `/api/${resource}/${id}`), `${label} deleted`);
  }

  async function toggleActive(person: ProfileDTO) {
    await run(
      () => api("PATCH", `/api/doctors/${person.id}`, { isActive: !person.isActive }),
      person.isActive ? "Account deactivated" : "Account activated",
    );
  }

  const byDoctor = groupBy(data.appointments, (a) => a.doctorId);
  const revenueByDoctor = data.doctors.map((d) => ({
    doctor: d,
    total: data.appointments
      .filter((a) => a.doctorId === d.id && a.status === "completed")
      .reduce((s, a) => s + (a.price ?? 0), 0),
    count: (byDoctor.get(d.id) ?? []).length,
  }));
  const maxRevenue = Math.max(1, ...revenueByDoctor.map((r) => r.total));
  const statusCounts = ["scheduled", "completed", "cancelled", "no_show"].map((s) => ({
    status: s,
    count: data.appointments.filter((a) => a.status === s).length,
  }));
  const maxStatus = Math.max(1, ...statusCounts.map((s) => s.count));
  const kindCounts = [...groupBy(data.appointments, (a) => a.kind)].map(([kind, rows]) => ({
    kind,
    count: rows.length,
  }));
  const maxKind = Math.max(1, ...kindCounts.map((k) => k.count));

  const adherence = data.clients
    .map((c) => ({
      client: c,
      logs: data.doseLogs.filter((l) => l.clientId === c.id).length,
      plans: data.plans.filter((p) => p.clientId === c.id).length,
    }))
    .sort((a, b) => b.logs - a.logs)
    .slice(0, 5);

  return (
    <>
      <Shell
        user={data.me}
        nav={NAV.map((n) => ({
          ...n,
          count: n.id === "clients" ? data.clients.length : n.id === "appointments" ? todays.length : undefined,
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
        {view === "overview" ? (
          <div className="space-y-5">
            <Card className="relative isolate overflow-hidden border-0 bg-gradient-to-br from-[#211638] via-[#39245c] to-[#654a87] p-0 text-white shadow-[0_24px_60px_-28px_rgba(40,24,67,0.75)]">
              <div className="pointer-events-none absolute -end-12 -top-20 h-64 w-64 rounded-full border border-white/10 bg-white/[0.04]" />
              <div className="pointer-events-none absolute -end-2 bottom-[-7rem] h-56 w-56 rounded-full bg-[#c9a7f5]/15 blur-3xl" />
              <div className="relative grid gap-6 p-5 sm:p-7 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/75">
                    <Sparkles className="h-3.5 w-3.5 text-[#e5c8ff]" /> EVIDA monthly momentum
                  </div>
                  <p className="mt-4 text-sm font-medium text-white/65">This month's collected revenue</p>
                  <div className="mt-1 flex flex-wrap items-end gap-x-3 gap-y-1">
                    <p className="num font-display text-4xl font-extrabold tracking-tight sm:text-5xl">{currency(monthRevenue)}</p>
                    <span className="mb-1 inline-flex items-center gap-1 rounded-full bg-emerald-300/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-200">
                      <TrendingUp className="h-3.5 w-3.5" /> {monthlyGoal > 0 ? `${goalProgress}% of goal` : "Goal not set"}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-white/55">Based on completed appointments this month</p>
                </div>
                <div className="rounded-2xl border border-white/15 bg-white/[0.08] p-4 backdrop-blur-sm sm:p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm font-semibold"><Target className="h-4 w-4 text-[#e5c8ff]" /> Monthly revenue goal</div>
                    {monthlyGoal > 0 ? <span className="num text-xs text-white/70">{goalProgress}%</span> : null}
                  </div>
                  <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/15">
                    <div className="h-full rounded-full bg-gradient-to-r from-[#c8a7f5] via-[#e6c8ff] to-[#a6e5c4] transition-all duration-700" style={{ width: `${goalProgress}%` }} />
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-white/65">
                    <span>{monthlyGoal > 0 ? `${currency(monthRevenue)} achieved` : "Set a target to track progress"}</span>
                    <span>{monthlyGoal > 0 ? currency(monthlyGoal) : "—"}</span>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <input aria-label="Monthly revenue target in EGP" type="number" min="1" step="500" value={goalInput} onChange={(e) => setGoalInput(e.target.value)} placeholder="Enter target (EGP)" className="h-10 min-w-0 flex-1 rounded-xl border border-white/15 bg-white/10 px-3 text-sm text-white outline-none placeholder:text-white/40 focus:border-white/40" />
                    <Button size="sm" onClick={saveMonthlyGoal} loading={goalSaving} className="!bg-white !text-[#39245c] hover:!bg-[#f2eaff]" type="button">
                      {monthlyGoal > 0 ? "Update goal" : "Set goal"}
                    </Button>
                  </div>
                  {goalMessage ? <p className="mt-2 text-[11px] text-white/70">{goalMessage}</p> : null}
                  {monthlyGoal > 0 ? <p className="mt-2 text-[11px] text-white/55">{goalRemaining > 0 ? `${currency(goalRemaining)} left to reach the goal` : "Goal reached — amazing work!"}</p> : null}
                </div>
              </div>
            </Card>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <StatTile label="Clients" value={data.stats.clients} hint={`${unassigned.length} without a doctor`} icon={<Users className="h-5 w-5" />} />
              <StatTile label="Appointments today" value={data.stats.appointmentsToday} hint="Across all doctors" tone="clay" icon={<CalendarDays className="h-5 w-5" />} />
              <StatTile label="Upcoming" value={data.stats.appointmentsUpcoming} hint="Still to be seen" tone="moss" icon={<Activity className="h-5 w-5" />} />
              <StatTile label="Collected revenue" value={currency(data.stats.revenue)} hint={`${data.stats.completed} completed visits`} tone="clay" icon={<Wallet className="h-5 w-5" />} />
              <StatTile label="Active treatment plans" value={data.stats.activePlans} hint={`${data.stats.activeDietPlans} active diet plans`} icon={<ClipboardList className="h-5 w-5" />} />
              <StatTile label="Medical records" value={data.stats.records} hint="Across all files" tone="berry" icon={<Stethoscope className="h-5 w-5" />} />
            </div>

            {unassigned.length > 0 ? (
              <Card className="border-clay-300/60 bg-clay-100/40 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-display text-sm font-bold text-clay-600">
                      {unassigned.length} client{unassigned.length === 1 ? "" : "s"} without a responsible doctor
                    </p>
                    <p className="mt-1 text-xs text-ink/60">
                      An unlinked client cannot book an appointment and no doctor can see their data.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {unassigned.slice(0, 3).map((c) => (
                      <Button
                        key={c.id}
                        size="sm"
                        variant="outline"
                        icon={<Link2 className="h-3.5 w-3.5" />}
                        onClick={() => setAssignModal({ open: true, clientId: c.id })}
                        type="button"
                      >
                        Link {c.fullName.split(" ")[0]}
                      </Button>
                    ))}
                  </div>
                </div>
              </Card>
            ) : null}

            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <SectionHeader
                  title="Today's agenda"
                  subtitle={fmtDate(new Date().toISOString())}
                  icon={<CalendarDays className="h-4 w-4" />}
                  action={
                    <Button size="sm" variant="ghost" onClick={() => setView("appointments")} type="button">
                      All appointments
                    </Button>
                  }
                />
                {todays.length === 0 ? (
                  <EmptyState
                    title="No appointments today"
                    hint="Use “New appointment” to book one"
                    icon={<CalendarDays className="h-5 w-5" />}
                  />
                ) : (
                  todays.map((a) => (
                    <AppointmentRow
                      key={a.id}
                      appt={a}
                      showClient
                      showDoctor
                      canEdit
                      onEdit={() => setApptModal({ open: true, appt: a })}
                      onComplete={() => changeStatus(a, "completed")}
                      onCancel={() => changeStatus(a, "cancelled")}
                      onDelete={() => remove("appointments", a.id, "appointment")}
                    />
                  ))
                )}
              </Card>

              <Card>
                <SectionHeader title="Recent activity" subtitle="Appointment movement log" icon={<Activity className="h-4 w-4" />} />
                <div className="max-h-[26rem] overflow-y-auto px-4 py-3">
                  {data.history.length === 0 ? (
                    <p className="py-6 text-center text-xs text-ink/45">No activity yet</p>
                  ) : (
                    <ol className="relative space-y-4 border-s border-ink/10 ps-4">
                      {data.history.slice(0, 12).map((h) => (
                        <li key={h.id} className="relative">
                          <span className="absolute -start-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-iris-400" />
                          <p className="text-xs font-semibold text-ink">
                            {h.action === "created" ? "Appointment booked" : STATUS_LABELS[h.action] ?? h.action}
                            {h.clientName ? ` — ${h.clientName}` : ""}
                          </p>
                          {h.detail ? <p className="mt-0.5 text-[11px] leading-5 text-ink/55">{h.detail}</p> : null}
                          <p className="mt-0.5 text-[10px] text-ink/40">
                            {fmtRelative(h.createdAt)} {h.actorName ? `· ${h.actorName}` : ""}
                          </p>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              </Card>
            </div>

            <Card>
              <SectionHeader
                title="Workload per doctor"
                subtitle="Appointment count and collected revenue"
                icon={<BarChart3 className="h-4 w-4" />}
              />
              <div className="grid gap-4 px-5 py-4 sm:grid-cols-2">
                {revenueByDoctor.map((row) => (
                  <div key={row.doctor.id} className="rounded-xl border border-ink/8 bg-white p-3.5">
                    <div className="flex items-center gap-3">
                      <Avatar name={row.doctor.fullName} hue={row.doctor.avatarHue} size={38} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold text-ink">{row.doctor.fullName}</p>
                        <p className="truncate text-[11px] text-ink/50">{row.doctor.specialization ?? "—"}</p>
                      </div>
                      <div className="text-end">
                        <p className="num text-sm font-bold text-iris-700">{currency(row.total)}</p>
                        <p className="num text-[10px] text-ink/45">{row.count} appointments</p>
                      </div>
                    </div>
                    <div className="mt-3">
                      <Bar value={row.total} max={maxRevenue} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        ) : null}

        {view === "clients" ? (
          <Card>
            <SectionHeader
              title={`Clients (${filteredClients.length})`}
              subtitle="Click a client name to open the full file"
              icon={<Users className="h-4 w-4" />}
              action={
                <Button size="sm" icon={<UserPlus className="h-4 w-4" />} onClick={() => setClientModal({ open: true })} type="button">
                  New client
                </Button>
              }
            />
            <div className="flex flex-wrap gap-2 border-b border-ink/8 px-5 py-3">
              <div className="relative min-w-[220px] flex-1">
                <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" />
                <SearchInput
                  className="ps-9"
                  placeholder="Search by name, email or phone…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <select
                value={doctorFilter}
                onChange={(e) => setDoctorFilter(e.target.value)}
                className="rounded-lg border border-ink/12 bg-white px-3 py-2 text-sm"
              >
                <option value="all">All doctors</option>
                {data.doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.fullName}
                  </option>
                ))}
                <option value="none">Unassigned</option>
              </select>
            </div>

            {filteredClients.length === 0 ? (
              <EmptyState title="No matching clients" hint="Try a different search or filter" icon={<Users className="h-5 w-5" />} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-start text-sm">
                  <thead className="bg-sand-100/70 text-[11px] text-ink/55">
                    <tr>
                      <th className="px-5 py-2.5 text-start font-semibold">Client</th>
                      <th className="px-3 py-2.5 text-start font-semibold">Responsible doctor</th>
                      <th className="px-3 py-2.5 text-start font-semibold">Measurements</th>
                      <th className="px-3 py-2.5 text-start font-semibold">Appointments</th>
                      <th className="px-5 py-2.5 text-end font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredClients.map((c) => {
                      const assignment = assignmentByClient.get(c.id);
                      const value = bmi(c.heightCm, c.weightKg);
                      return (
                        <tr key={c.id} className="border-t border-ink/6 transition hover:bg-sand-50">
                          <td className="px-5 py-3">
                            <button type="button" onClick={() => setFileClient(c)} className="flex items-center gap-3 text-start">
                              <Avatar name={c.fullName} hue={c.avatarHue} size={36} />
                              <span className="min-w-0">
                                <span className="block truncate text-[13px] font-semibold text-ink hover:text-iris-700">
                                  {c.fullName}
                                </span>
                                <span className="block truncate text-[11px] text-ink/50">
                                  {c.email} · {c.phone ?? "—"}
                                </span>
                              </span>
                            </button>
                          </td>
                          <td className="px-3 py-3">
                            {assignment ? <Badge tone="pine">{assignment.doctorName}</Badge> : <Badge tone="clay">Unassigned</Badge>}
                          </td>
                          <td className="num px-3 py-3 text-[11px] text-ink/60">
                            {c.weightKg ? `${c.weightKg} kg` : "—"}
                            {value ? ` · BMI ${value} (${bmiLabel(value)})` : ""}
                          </td>
                          <td className="num px-3 py-3 text-[12px] text-ink/70">{appointmentsCount(c.id)}</td>
                          <td className="px-5 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <Button size="sm" variant="soft" onClick={() => setFileClient(c)} type="button">
                                File
                              </Button>
                              <button
                                type="button"
                                onClick={() => setAssignModal({ open: true, row: assignment ?? null, clientId: c.id })}
                                className="rounded-lg p-1.5 text-ink/45 hover:bg-sand-100 hover:text-iris-600"
                                aria-label="Link to a doctor"
                              >
                                <Link2 className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setClientModal({ open: true, client: c })}
                                className="rounded-lg p-1.5 text-ink/45 hover:bg-sand-100 hover:text-iris-600"
                                aria-label="Edit"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => remove("clients", c.id, `client ${c.fullName}`)}
                                className="rounded-lg p-1.5 text-ink/45 hover:bg-berry-100 hover:text-berry-600"
                                aria-label="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        ) : null}

        {view === "doctors" ? (
          <Card>
            <SectionHeader
              title={`Medical team (${data.doctors.length})`}
              subtitle="Creating and deactivating staff accounts is an admin action"
              icon={<Stethoscope className="h-4 w-4" />}
              action={
                <Button size="sm" icon={<UserPlus className="h-4 w-4" />} onClick={() => setStaffModal({ open: true })} type="button">
                  New doctor
                </Button>
              }
            />
            <div className="grid gap-3 px-5 py-4 md:grid-cols-2">
              {data.doctors.map((d) => {
                const clients = data.clients.filter((c) => assignmentByClient.get(c.id)?.doctorId === d.id);
                const appts = data.appointments.filter((a) => a.doctorId === d.id);
                const revenue = appts.filter((a) => a.status === "completed").reduce((s, a) => s + (a.price ?? 0), 0);
                return (
                  <div key={d.id} className="lift rounded-2xl border border-ink/8 bg-white p-4">
                    <div className="flex items-start gap-3">
                      <Avatar name={d.fullName} hue={d.avatarHue} size={46} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate font-display text-sm font-bold text-ink">{d.fullName}</p>
                          <Badge tone={d.isActive ? "moss" : "berry"}>{d.isActive ? "Active" : "Deactivated"}</Badge>
                        </div>
                        <p className="mt-0.5 truncate text-[11px] text-ink/55">
                          {d.specialization ?? "No specialty"} · {d.licenseNumber ?? "No license"}
                        </p>
                        <p className="mt-0.5 truncate text-[11px] text-ink/45">{d.email}</p>
                      </div>
                    </div>

                    {d.bio ? <p className="mt-3 text-[11px] leading-5 text-ink/60">{d.bio}</p> : null}

                    <div className="num mt-3 grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-xl bg-sand-100 py-2">
                        <p className="text-sm font-bold text-ink">{clients.length}</p>
                        <p className="text-[10px] text-ink/50">clients</p>
                      </div>
                      <div className="rounded-xl bg-sand-100 py-2">
                        <p className="text-sm font-bold text-ink">{appts.length}</p>
                        <p className="text-[10px] text-ink/50">appointments</p>
                      </div>
                      <div className="rounded-xl bg-sand-100 py-2">
                        <p className="text-sm font-bold text-iris-700">{revenue.toLocaleString("en-US")}</p>
                        <p className="text-[10px] text-ink/50">EGP collected</p>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => setStaffModal({ open: true, staff: d })} icon={<Pencil className="h-3.5 w-3.5" />} type="button">
                        Edit
                      </Button>
                      <Button size="sm" variant="soft" onClick={() => toggleActive(d)} type="button">
                        {d.isActive ? "Deactivate" : "Activate"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setDoctorFilter(d.id);
                          setView("appointments");
                        }}
                        type="button"
                      >
                        Appointments
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-berry-500 hover:bg-berry-100"
                        onClick={() => remove("doctors", d.id, `doctor ${d.fullName}`)}
                        type="button"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        ) : null}

        {view === "assignments" ? (
          <div className="space-y-4">
            <Card>
              <SectionHeader
                title={`Current assignments (${data.assignments.length})`}
                subtitle="This link is what grants a doctor access to a client's data"
                icon={<Link2 className="h-4 w-4" />}
                action={
                  <Button size="sm" icon={<Link2 className="h-4 w-4" />} onClick={() => setAssignModal({ open: true })} type="button">
                    New assignment
                  </Button>
                }
              />
              {data.assignments.length === 0 ? (
                <EmptyState title="No assignments yet" icon={<Link2 className="h-5 w-5" />} />
              ) : (
                <div className="divide-y divide-ink/6">
                  {data.assignments.map((a) => (
                    <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar name={a.clientName} hue={168} size={36} />
                        <div>
                          <p className="text-[13px] font-semibold text-ink">{a.clientName}</p>
                          <p className="text-[11px] text-ink/50">{a.clientEmail}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-ink/45">
                        <Link2 className="h-4 w-4" />
                        <Badge tone="pine">{a.doctorName}</Badge>
                        {a.doctorSpecialization ? <span className="text-[11px]">{a.doctorSpecialization}</span> : null}
                      </div>
                      <p className="max-w-[16rem] truncate text-[11px] text-ink/50">{a.note ?? "No note"}</p>
                      <p className="text-[10px] text-ink/40">{fmtShortDate(a.assignedAt)}</p>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => setAssignModal({ open: true, row: a })} type="button">
                          Change doctor
                        </Button>
                        <button
                          type="button"
                          onClick={() => remove("assignments", a.id, "assignment")}
                          className="rounded-lg p-1.5 text-ink/45 hover:bg-berry-100 hover:text-berry-600"
                          aria-label="Remove assignment"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card>
              <SectionHeader title={`Unassigned clients (${unassigned.length})`} icon={<Users className="h-4 w-4" />} />
              {unassigned.length === 0 ? (
                <EmptyState title="Every client is linked to a doctor" hint="Nothing waiting for assignment" />
              ) : (
                <div className="flex flex-wrap gap-2 px-5 py-4">
                  {unassigned.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setAssignModal({ open: true, clientId: c.id })}
                      className="flex items-center gap-2 rounded-xl border border-clay-300/60 bg-clay-100/50 px-3 py-2 text-xs font-medium text-clay-600 transition hover:bg-clay-100"
                    >
                      <Avatar name={c.fullName} hue={c.avatarHue} size={26} />
                      {c.fullName}
                      <Link2 className="h-3.5 w-3.5" />
                    </button>
                  ))}
                </div>
              )}
            </Card>
          </div>
        ) : null}

        {view === "invoices" ? <BillingManager invoices={data.invoices} onDone={refresh} /> : null}

        {view === "appointments" ? (
          <Card>
            <SectionHeader
              title={`Appointments (${filteredAppointments.length})`}
              subtitle="Every appointment in the clinic, with filters"
              icon={<CalendarDays className="h-4 w-4" />}
              action={
                <Button size="sm" icon={<CalendarPlus className="h-4 w-4" />} onClick={() => setApptModal({ open: true })} type="button">
                  New appointment
                </Button>
              }
            />
            <div className="flex flex-wrap gap-2 border-b border-ink/8 px-5 py-3">
              <div className="relative min-w-[200px] flex-1">
                <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" />
                <SearchInput className="ps-9" placeholder="Search by client name…" value={query} onChange={(e) => setQuery(e.target.value)} />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-lg border border-ink/12 bg-white px-3 py-2 text-sm"
              >
                <option value="all">All statuses</option>
                {["scheduled", "completed", "cancelled", "no_show"].map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
              <select
                value={doctorFilter}
                onChange={(e) => setDoctorFilter(e.target.value)}
                className="rounded-lg border border-ink/12 bg-white px-3 py-2 text-sm"
              >
                <option value="all">All doctors</option>
                {data.doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.fullName}
                  </option>
                ))}
              </select>
            </div>
            {filteredAppointments.length === 0 ? (
              <EmptyState title="No matching appointments" icon={<CalendarDays className="h-5 w-5" />} />
            ) : (
              filteredAppointments.map((a) => (
                <AppointmentRow
                  key={a.id}
                  appt={a}
                  showClient
                  showDoctor
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
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <SectionHeader title={`Treatment plans (${data.plans.length})`} icon={<ClipboardList className="h-4 w-4" />} />
              {data.plans.length === 0 ? (
                <EmptyState title="No treatment plans" hint="Doctors add plans from the client file" />
              ) : (
                <div className="divide-y divide-ink/6">
                  {data.plans.map((p) => {
                    const client = data.clients.find((c) => c.id === p.clientId);
                    return (
                      <div key={p.id} className="px-5 py-3.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-[13px] font-semibold text-ink">{p.title}</p>
                          <Badge tone={STATUS_TONES[p.status] ?? "neutral"}>{STATUS_LABELS[p.status] ?? p.status}</Badge>
                        </div>
                        <p className="mt-1 text-[11px] text-ink/55">
                          {client?.fullName ?? "Client"} · {p.doctorName ?? "No doctor"} ·{" "}
                          {p.startDate ? fmtShortDate(p.startDate) : "—"} → {p.endDate ? fmtShortDate(p.endDate) : "open ended"}
                        </p>
                        <div className="mt-2">
                          <Bar value={p.sessionsDone} max={Math.max(1, p.sessionsTotal)} />
                          <p className="num mt-1 text-[10px] text-ink/50">
                            {p.sessionsDone}/{p.sessionsTotal} sessions
                          </p>
                        </div>
                        <div className="mt-2 flex gap-2">
                          <Button size="sm" variant="ghost" onClick={() => client && setFileClient(client)} type="button">
                            Open client file
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              run(
                                () => api("PATCH", `/api/treatment-plans/${p.id}`, { sessionsDone: p.sessionsDone + 1 }),
                                "Session logged",
                              )
                            }
                            type="button"
                          >
                            + session
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            <Card>
              <SectionHeader title={`Diet plans (${data.dietPlans.length})`} icon={<Salad className="h-4 w-4" />} />
              {data.dietPlans.length === 0 ? (
                <EmptyState title="No diet plans" />
              ) : (
                <div className="divide-y divide-ink/6">
                  {data.dietPlans.map((d) => {
                    const client = data.clients.find((c) => c.id === d.clientId);
                    const mealCount = data.meals.filter((m) => m.dietPlanId === d.id).length;
                    return (
                      <div key={d.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5">
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-semibold text-ink">{d.title}</p>
                          <p className="num mt-0.5 text-[11px] text-ink/55">
                            {client?.fullName ?? "Client"} · {d.dailyCalories ?? "—"} kcal/day · {mealCount} meals
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge tone={STATUS_TONES[d.status] ?? "neutral"}>{STATUS_LABELS[d.status] ?? d.status}</Badge>
                          <Button size="sm" variant="ghost" onClick={() => client && setFileClient(client)} type="button">
                            Details
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        ) : null}

        {view === "reports" ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatTile label="Total appointments" value={data.stats.appointmentsTotal} icon={<CalendarDays className="h-5 w-5" />} />
              <StatTile label="Completed visits" value={data.stats.completed} tone="moss" icon={<Activity className="h-5 w-5" />} />
              <StatTile label="Cancellations" value={data.stats.cancelled} tone="berry" icon={<Trash2 className="h-5 w-5" />} />
              <StatTile label="Revenue" value={currency(data.stats.revenue)} tone="clay" icon={<Wallet className="h-5 w-5" />} />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <SectionHeader title="Appointment statuses" subtitle="Distribution of all recorded appointments" icon={<BarChart3 className="h-4 w-4" />} />
                <div className="space-y-3 px-5 py-4">
                  {statusCounts.map((s) => (
                    <div key={s.status}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="font-medium text-ink/70">{STATUS_LABELS[s.status]}</span>
                        <span className="num font-bold text-ink">{s.count}</span>
                      </div>
                      <Bar
                        value={s.count}
                        max={maxStatus}
                        tone={
                          s.status === "completed"
                            ? "bg-moss-500"
                            : s.status === "cancelled"
                              ? "bg-berry-500"
                              : s.status === "scheduled"
                                ? "bg-clay-500"
                                : "bg-sand-300"
                        }
                      />
                    </div>
                  ))}
                </div>
              </Card>

              <Card>
                <SectionHeader title="Visit types" subtitle="What clients book the most" icon={<Stethoscope className="h-4 w-4" />} />
                <div className="space-y-3 px-5 py-4">
                  {kindCounts.map((row) => (
                    <div key={row.kind}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="font-medium text-ink/70">{KIND_LABELS[row.kind] ?? row.kind}</span>
                        <span className="num font-bold text-ink">{row.count}</span>
                      </div>
                      <Bar value={row.count} max={maxKind} tone="bg-iris-400" />
                    </div>
                  ))}
                  {data.appointments.length === 0 ? <p className="py-6 text-center text-xs text-ink/45">No data yet</p> : null}
                </div>
              </Card>

              <Card>
                <SectionHeader title="Client dose adherence" subtitle="Logged doses per client" icon={<ClipboardList className="h-4 w-4" />} />
                <div className="space-y-3 px-5 py-4">
                  {adherence.length === 0 ? (
                    <p className="py-6 text-center text-xs text-ink/45">No dose logs yet</p>
                  ) : (
                    adherence.map((row) => (
                      <div key={row.client.id} className="flex items-center gap-3">
                        <Avatar name={row.client.fullName} hue={row.client.avatarHue} size={32} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-ink">{row.client.fullName}</p>
                          <div className="mt-1">
                            <Bar value={row.logs} max={Math.max(1, ...adherence.map((a) => a.logs))} tone="bg-clay-500" />
                          </div>
                        </div>
                        <span className="num text-xs font-bold text-ink/70">{row.logs}</span>
                      </div>
                    ))
                  )}
                </div>
              </Card>

              <Card>
                <SectionHeader title="Revenue by doctor" subtitle="Completed visits only" icon={<Wallet className="h-4 w-4" />} />
                <div className="space-y-3 px-5 py-4">
                  {revenueByDoctor.map((row) => (
                    <div key={row.doctor.id}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="font-medium text-ink/70">{row.doctor.fullName}</span>
                        <span className="num font-bold text-iris-700">{currency(row.total)}</span>
                      </div>
                      <Bar value={row.total} max={maxRevenue} />
                    </div>
                  ))}
                  <div className="mt-4 flex items-center justify-between rounded-xl bg-iris-50 px-3 py-2.5">
                    <span className="text-xs font-semibold text-iris-700">Grand total</span>
                    <span className="num text-sm font-bold text-iris-700">{currency(data.stats.revenue)}</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        ) : null}

        {view === "offers" ? <OffersManager /> : null}

        {view === "notifications" ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <SectionHeader
                title="Send a notification"
                subtitle="To one client, all clients or all doctors"
                icon={<Bell className="h-4 w-4" />}
                action={
                  <Button size="sm" onClick={() => setNotifModal(true)} type="button">
                    Custom message
                  </Button>
                }
              />
              <div className="grid gap-2 px-5 py-4 sm:grid-cols-2">
                {[
                  {
                    title: "Reminder: appointment tomorrow",
                    body: "A quick reminder that you have an appointment at the clinic tomorrow. Call us if you need to reschedule.",
                    target: "role:all-clients",
                    kind: "appointment",
                  },
                  {
                    title: "Update your measurements",
                    body: "Please update your weight and height from your profile so the follow-up stays accurate.",
                    target: "role:all-clients",
                    kind: "info",
                  },
                  {
                    title: "Weekly team meeting",
                    body: "The weekly team meeting is at 9:00 AM at the clinic.",
                    target: "role:all-doctors",
                    kind: "info",
                  },
                  {
                    title: "Stay on track with your doses",
                    body: "Remember to log your daily dose from the Treatment section.",
                    target: "role:all-clients",
                    kind: "medication",
                  },
                ].map((tpl) => (
                  <button
                    key={tpl.title}
                    type="button"
                    onClick={async () => {
                      const [type, id] = tpl.target.split(":");
                      await run(
                        () =>
                          api("POST", "/api/notifications", {
                            title: tpl.title,
                            body: tpl.body,
                            kind: tpl.kind,
                            ...(type === "role" ? { targetRole: id } : {}),
                          }),
                        "Notification sent",
                      );
                    }}
                    className="rounded-xl border border-ink/8 bg-white p-3 text-start transition hover:border-iris-300"
                  >
                    <p className="text-[13px] font-semibold text-ink">{tpl.title}</p>
                    <p className="mt-1 text-[11px] leading-5 text-ink/55">{tpl.body}</p>
                    <span className="mt-2 inline-block text-[10px] font-semibold text-iris-600">
                      {tpl.target.includes("doctors") ? "To all doctors" : "To all clients"} · send
                    </span>
                  </button>
                ))}
              </div>
            </Card>

            <Card>
              <SectionHeader title="Your inbox" subtitle="What the system and the team sent you" icon={<Bell className="h-4 w-4" />} />
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
                        <p className="mt-1 text-[10px] text-ink/40">
                          {fmtRelative(n.createdAt)} {n.actorName ? `· ${n.actorName}` : ""}
                        </p>
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

      {clientModal.open ? (
        <ClientForm
          open
          onClose={() => setClientModal({ open: false })}
          onDone={refresh}
          doctors={data.doctors}
          initial={clientModal.client ?? null}
        />
      ) : null}
      {staffModal.open ? (
        <StaffForm open onClose={() => setStaffModal({ open: false })} onDone={refresh} initial={staffModal.staff ?? null} />
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
        />
      ) : null}
      {assignModal.open ? (
        <AssignmentForm
          open
          onClose={() => setAssignModal({ open: false })}
          onDone={refresh}
          clients={data.clients}
          doctors={data.doctors}
          initial={
            assignModal.row
              ? {
                  id: assignModal.row.id,
                  clientId: assignModal.row.clientId,
                  doctorId: assignModal.row.doctorId,
                  note: assignModal.row.note,
                }
              : assignModal.clientId
                ? { id: "", clientId: assignModal.clientId, doctorId: "", note: null }
                : null
          }
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
