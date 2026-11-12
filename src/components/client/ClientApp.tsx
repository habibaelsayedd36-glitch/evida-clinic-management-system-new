"use client";

import { useMemo, useState } from "react";
import {
  Bell,
  CalendarDays,
  CalendarPlus,
  ClipboardList,
  HeartPulse,
  LayoutDashboard,
  Pill,
  Salad,
  Stethoscope,
  Trash2,
  UserCog,
  UtensilsCrossed,
  Check,
  Scale,
  MessageCircle,
  Printer,
} from "lucide-react";
import { api, bmi, bmiLabel, fmtDate, fmtDateTime, fmtRelative, fmtTime, isSameDay, useBootstrap } from "@/lib/client";
import { TIME_LABELS, type AppointmentDTO, type Bootstrap, type InvoiceDTO } from "@/lib/types";
import { Avatar, Badge, Bar, Button, Card, EmptyState, Progress, SectionHeader, StatTile } from "@/components/ui";
import { Shell, type NavItem } from "@/components/Shell";
import { AppointmentForm, ProfileForm, useSubmit } from "@/components/forms";
import { AppointmentRow, DietCard, PlanCard, RecordCard } from "@/components/clinical";

const NAV: NavItem[] = [
  { id: "home", label: "Home", icon: LayoutDashboard },
  { id: "appointments", label: "My appointments", icon: CalendarDays },
  { id: "services", label: "Services", icon: Salad },
  { id: "diet", label: "Diet plan", icon: Salad },
  { id: "treatment", label: "Treatment", icon: ClipboardList },
  { id: "records", label: "Medical records", icon: Stethoscope },
  { id: "invoices", label: "My invoices", icon: ClipboardList },
  { id: "profile", label: "My profile", icon: UserCog },
  { id: "notifications", label: "Notifications", icon: Bell },
];

const TITLES: Record<string, { title: string; subtitle: string }> = {
  home: { title: "Welcome to EVIDA", subtitle: "Your health follow-up in one place" },
  appointments: { title: "My appointments", subtitle: "Book, confirm or request a different appointment time" },
  services: { title: "EVIDA Services", subtitle: "Nutrition and weight-management services with clinic pricing" },
  diet: { title: "Diet plan", subtitle: "The daily meals your doctor wrote for you" },
  treatment: { title: "Treatment protocol", subtitle: "Your assigned protocol, sessions and dose schedule" },
  records: { title: "Medical records", subtitle: "Diagnosis and measurements from your visits" },
  invoices: { title: "My invoices", subtitle: "View your invoices, payment history and remaining balance" },
  profile: { title: "My profile", subtitle: "Your data and measurements — visible only to you and your care team" },
  notifications: { title: "Notifications", subtitle: "Alerts from the clinic and your care team" },
};

export function ClientApp({ initial }: { initial: Bootstrap }) {
  const { data, refresh, loading } = useBootstrap(initial);
  const { run } = useSubmit(refresh);
  const [view, setView] = useState("home");
  const [apptModal, setApptModal] = useState<{ open: boolean; appt?: AppointmentDTO | null }>({ open: false });
  const [profileModal, setProfileModal] = useState(false);

  const me = data.me;
  const myDoctor = data.doctors[0] ?? null;
  const assignment = data.assignments.find((a) => a.clientId === me.id) ?? null;

  const upcoming = useMemo(
    () =>
      data.appointments
        .filter((a) => ["scheduled", "pending_doctor", "pending_client", "not_confirmed"].includes(a.status) && new Date(a.scheduledAt) >= new Date())
        .sort((a, b) => +new Date(a.scheduledAt) - +new Date(b.scheduledAt)),
    [data.appointments],
  );
  const next = upcoming[0] ?? null;
  const past = data.appointments.filter((a) => new Date(a.scheduledAt) < new Date());
  const myInvoices = data.invoices.filter((invoice) => invoice.clientId === me.id);
  const activePlans = data.plans.filter((p) => p.status === "active");
  const activeDiets = data.dietPlans.filter((d) => d.status === "active");
  const activeDoses = data.doses.filter((d) => d.active);
  const value = bmi(me.heightCm, me.weightKg);
  const weightToTarget =
    me.weightKg && me.targetWeightKg ? Math.max(0, Math.round((me.weightKg - me.targetWeightKg) * 10) / 10) : null;

  function printInvoice(invoice: InvoiceDTO) {
    const popup = window.open("", "_blank", "width=900,height=700");
    if (!popup) {
      window.alert("Please allow pop-ups to print your invoice.");
      return;
    }
    const escapeHtml = (value: string) => {
      const entities: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "\'": "&#39;" };
      return value.replace(/[&<>"\']/g, (char) => entities[char]);
    };
    const money = (amount: number) => `${amount.toLocaleString("en-US")} EGP`;
    const payments = invoice.payments.length
      ? invoice.payments.map((payment) => `<tr><td>${escapeHtml(fmtDateTime(payment.paidAt))}</td><td>${escapeHtml(payment.method.replace(/_/g, " "))}</td><td class="amount">${money(payment.amount)}</td></tr>`).join("")
      : `<tr><td colspan="3" class="muted">No payments recorded</td></tr>`;
    popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Invoice ${escapeHtml(invoice.invoiceNumber)}</title><style>
      *{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#242238;margin:0;padding:40px;background:#fff}.sheet{max-width:760px;margin:auto}.top{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #514477;padding-bottom:22px}.brand{font-size:27px;font-weight:800;letter-spacing:2px;color:#514477}.muted{color:#777;font-size:12px}.heading{font-size:25px;margin:28px 0 6px}.meta{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:22px 0}.meta div,.totals div{background:#f7f5f1;padding:13px;border-radius:8px}.label{font-size:11px;color:#777;margin-bottom:5px}.value{font-size:14px;font-weight:700}table{width:100%;border-collapse:collapse;margin-top:24px}th,td{text-align:left;padding:12px 10px;border-bottom:1px solid #e9e6e1;font-size:12px}th{background:#f7f5f1}.amount{text-align:right;font-weight:700}.totals{width:320px;margin:24px 0 0 auto;display:grid;gap:8px}.totals div{display:flex;justify-content:space-between;align-items:center}.balance{color:#514477;font-weight:800}.footer{margin-top:42px;padding-top:14px;border-top:1px solid #e9e6e1;text-align:center;color:#777;font-size:11px}@media print{body{padding:0}.sheet{max-width:none}.no-print{display:none}}
      </style></head><body><main class="sheet"><header class="top"><div><div class="brand">EVIDA CLINIC</div><div class="muted">Nutrition & Dermatology</div></div><div style="text-align:right"><div class="muted">INVOICE</div><strong>${escapeHtml(invoice.invoiceNumber)}</strong></div></header><h1 class="heading">Invoice</h1><div class="muted">Issued ${escapeHtml(fmtDate(invoice.createdAt))}</div><section class="meta"><div><div class="label">CLIENT</div><div class="value">${escapeHtml(me.fullName)}</div><div class="muted">${escapeHtml(me.email ?? "")}</div><div class="muted">${escapeHtml(me.phone ?? "")}</div></div><div><div class="label">SERVICE</div><div class="value">${escapeHtml(invoice.appointmentKind ?? "Clinic visit")}</div><div class="muted">Invoice number: ${escapeHtml(invoice.invoiceNumber)}</div></div></section><h3>Payment history</h3><table><thead><tr><th>Date</th><th>Payment method</th><th class="amount">Amount</th></tr></thead><tbody>${payments}</tbody></table><section class="totals"><div><span>Total</span><strong>${money(invoice.totalAmount)}</strong></div><div><span>Paid</span><strong>${money(invoice.paidAmount)}</strong></div><div><span>Remaining</span><strong class="balance">${money(invoice.remainingAmount)}</strong></div></section><footer class="footer">Thank you for choosing EVIDA Clinic</footer></main><script>window.onload=()=>{window.focus();window.print();};</script></body></html>`);
    popup.document.close();
  }

  async function cancel(appt: AppointmentDTO) {
    if (!window.confirm("Are you sure you want to cancel this appointment?")) return;
    await run(() => api("PATCH", `/api/appointments/${appt.id}`, { status: "cancelled" }), "Appointment cancelled");
  }

  async function logDose(doseId: string) {
    await run(() => api("POST", "/api/dose-logs", { doseId }), "Dose logged");
  }

  async function markRead(id: string, read: boolean) {
    await api("PATCH", `/api/notifications/${id}`, { read });
    await refresh();
  }

  const todaysMeals = activeDiets[0] ? data.meals.filter((m) => m.dietPlanId === activeDiets[0].id && m.dayIndex === 1) : [];

  return (
    <>
      <Shell
        user={me}
        nav={NAV.map((n) => ({
          ...n,
          count:
            n.id === "appointments" ? upcoming.length : n.id === "notifications" ? data.stats.unreadNotifications : undefined,
        }))}
        active={view}
        onNavigate={setView}
        notifications={data.notifications}
        onRefresh={refresh}
        refreshing={loading}
        title={view === "home" ? `Welcome, ${me.fullName}` : TITLES[view].title}
        subtitle={TITLES[view].subtitle}
        headerAction={
          <Button size="sm" icon={<CalendarPlus className="h-4 w-4" />} onClick={() => setApptModal({ open: true })} type="button">
            Book appointment
          </Button>
        }
      >
        {view === "home" ? (
          <div className="space-y-5">
            <Card className="overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-4 bg-iris-700 px-5 py-5 text-sand-50">
                <div className="min-w-0">
                  <p className="text-[11px] tracking-[0.16em] text-iris-100/80">NEXT APPOINTMENT</p>
                  {next ? (
                    <>
                      <p className="num mt-1.5 font-display text-2xl font-bold">{fmtDateTime(next.scheduledAt)}</p>
                      <p className="mt-1 text-xs text-iris-100/85">
                        {next.kind} · {next.durationMin} min · {next.location ?? "The clinic"}
                      </p>
                    </>
                  ) : (
                    <p className="mt-1.5 font-display text-xl font-bold">No upcoming appointment</p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {myDoctor ? (
                    <div className="flex items-center gap-2.5 rounded-xl bg-iris-800/60 px-3 py-2">
                      <Avatar name={myDoctor.fullName} hue={myDoctor.avatarHue} size={36} />
                      <div>
                        <p className="text-[13px] font-semibold">{myDoctor.fullName}</p>
                        <p className="text-[10px] text-iris-100/75">{myDoctor.specialization ?? "Responsible doctor"}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl bg-iris-600 px-3 py-2 text-[12px] font-semibold text-white">
                      No doctor assigned yet — clinic management will link you soon
                    </div>
                  )}
                  {next ? (
                    <Button
                      variant="outline"
                      className="!border-sand-50/30 !bg-transparent !text-sand-50 hover:!bg-sand-50/10"
                      onClick={() => cancel(next)}
                      type="button"
                    >
                      Cancel appointment
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      className="!border-sand-50/30 !bg-transparent !text-sand-50 hover:!bg-sand-50/10"
                      onClick={() => setApptModal({ open: true })}
                      type="button"
                    >
                      Book now
                    </Button>
                  )}
                </div>
              </div>
            </Card>

            

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatTile
                label="Current weight"
                value={me.weightKg ? `${me.weightKg} kg` : "—"}
                hint={weightToTarget !== null ? `${weightToTarget} kg to your target` : undefined}
                icon={<Scale className="h-5 w-5" />}
              />
              <StatTile label="Body mass index" value={value ?? "—"} hint={bmiLabel(value)} tone="clay" icon={<HeartPulse className="h-5 w-5" />} />
              <StatTile label="Scheduled doses" value={activeDoses.length} hint={`${data.doseLogs.length} logged doses`} tone="moss" icon={<Pill className="h-5 w-5" />} />
              <StatTile label="Past visits" value={past.length} hint={`${data.records.length} medical records`} icon={<CalendarDays className="h-5 w-5" />} />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <SectionHeader
                  title="Today's dose schedule"
                  subtitle="Tap the button once you take the dose"
                  icon={<Pill className="h-4 w-4" />}
                  action={
                    <Button size="sm" variant="ghost" onClick={() => setView("treatment")} type="button">
                      Treatment plan
                    </Button>
                  }
                />
                {activeDoses.length === 0 ? (
                  <EmptyState title="No active doses" hint="Your doctor adds doses along with the plan" icon={<Pill className="h-5 w-5" />} />
                ) : (
                  <div className="divide-y divide-ink/6">
                    {activeDoses.map((dose) => {
                      const taken = data.doseLogs.some((l) => l.doseId === dose.id && isSameDay(l.takenAt));
                      return (
                        <div key={dose.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                          <div className="min-w-0">
                            <p className="truncate text-[13px] font-semibold text-ink">{dose.dosage || "Dose"}</p>
                            <p className="mt-0.5 text-[11px] text-ink/55">
                              {dose.dosage ?? "—"} · {dose.frequency ?? "—"} ·{" "}
                              {dose.timeOfDay ? TIME_LABELS[dose.timeOfDay] ?? dose.timeOfDay : "—"}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant={taken ? "soft" : "primary"}
                            onClick={() => (taken ? undefined : logDose(dose.id))}
                            icon={taken ? <Check className="h-3.5 w-3.5" /> : undefined}
                            disabled={taken}
                            type="button"
                          >
                            {taken ? "Taken" : "Log dose"}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>

              <Card>
                <SectionHeader
                  title="Today's meals"
                  subtitle={activeDiets[0]?.title ?? "No active plan"}
                  icon={<UtensilsCrossed className="h-4 w-4" />}
                  action={
                    <Button size="sm" variant="ghost" onClick={() => setView("diet")} type="button">
                      Full plan
                    </Button>
                  }
                />
                {activeDiets.length === 0 ? (
                  <EmptyState title="No active diet plan" icon={<Salad className="h-5 w-5" />} />
                ) : todaysMeals.length === 0 ? (
                  <EmptyState title="No meals added yet" hint="Your doctor hasn't uploaded the meals for this plan" />
                ) : (
                  <div className="divide-y divide-ink/6">
                    {todaysMeals.map((meal) => (
                      <div key={meal.id} className="px-5 py-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[13px] font-semibold text-ink">
                            {TIME_LABELS[meal.timeOfDay] ?? meal.timeOfDay} · {meal.name}
                          </p>
                          {meal.calories ? <Badge tone="moss">{meal.calories} kcal</Badge> : null}
                        </div>
                        {meal.items ? <p className="mt-1 text-[11px] leading-5 text-ink/60">{meal.items}</p> : null}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            <Card>
              <SectionHeader title="Treatment progress" subtitle="Completed sessions out of the total" icon={<ClipboardList className="h-4 w-4" />} />
              {activePlans.length === 0 ? (
                <EmptyState title="No active plan" icon={<ClipboardList className="h-5 w-5" />} />
              ) : (
                <div className="grid gap-4 px-5 py-4 sm:grid-cols-2">
                  {activePlans.map((plan) => (
                    <div key={plan.id} className="rounded-xl border border-ink/8 bg-white p-3.5">
                      <p className="text-[13px] font-semibold text-ink">{plan.title}</p>
                      <p className="mt-1 text-[11px] text-ink/55">
                        {plan.startDate ? `${fmtDate(plan.startDate)} → ${plan.endDate ? fmtDate(plan.endDate) : "open ended"}` : ""}
                      </p>
                      <div className="mt-3">
                        <Progress value={plan.sessionsDone} total={plan.sessionsTotal} />
                        <p className="num mt-1.5 text-[11px] text-ink/55">
                          {plan.sessionsDone} of {plan.sessionsTotal} sessions
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        ) : null}

        {view === "appointments" ? (
          <div className="space-y-4">
            <Card>
              <SectionHeader
                title="Upcoming appointments"
                icon={<CalendarDays className="h-4 w-4" />}
                action={
                  <Button size="sm" icon={<CalendarPlus className="h-4 w-4" />} onClick={() => setApptModal({ open: true })} type="button">
                    New appointment
                  </Button>
                }
              />
              {upcoming.length === 0 ? (
                <EmptyState
                  title="No upcoming appointments"
                  hint="Book a visit with your responsible doctor"
                  icon={<CalendarDays className="h-5 w-5" />}
                />
              ) : (
                upcoming.map((a) => (
                  <AppointmentRow
                    key={a.id}
                    appt={a}
                    showDoctor
                    canEdit
                    onConfirm={a.status === "pending_client" ? () => void run(() => api("PATCH", `/api/appointments/${a.id}`, { status: "scheduled" }), "Appointment confirmed") : undefined}
                    onEdit={() => setApptModal({ open: true, appt: a })}
                    onClientReschedule={() => setApptModal({ open: true, appt: a })}
                    onCancel={() => cancel(a)}
                  />
                ))
              )}
            </Card>

            <Card>
              <SectionHeader title="Visit history" subtitle="Previous appointments and their status" icon={<ClipboardList className="h-4 w-4" />} />
              {past.length === 0 ? (
                <EmptyState title="No previous visits" />
              ) : (
                past.map((a) => <AppointmentRow key={a.id} appt={a} showDoctor canEdit={false} />)
              )}
            </Card>
          </div>
        ) : null}

        {view === "services" ? (
          <div className="space-y-4">
            <Card>
              <SectionHeader title="Nutrition & Weight Management" subtitle="All services require assessment by the treating doctor. Medication choice and dosing are determined by the doctor." icon={<Salad className="h-4 w-4" />} />
              <div className="divide-y divide-ink/8">
                <div className="px-5 py-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-sm font-semibold text-ink">Normal Diet</h3><p className="mt-1 text-xs leading-5 text-ink/60">30-minute nutrition consultation with a customized clinical diet plan, InBody body-composition assessment and macronutrient optimization. Plans are designed by Dr. Mohab and Dr. Omnia.</p></div><div className="text-end"><p className="num text-sm font-bold text-iris-700">500 EGP</p><p className="num text-xs text-ink/40 line-through">1,000 EGP</p></div></div></div>
                <div className="px-5 py-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-sm font-semibold text-ink">UNCUT – Semaglutide</h3><p className="mt-1 text-xs leading-5 text-ink/60">Medication-based weight-management service. The 10 Units option and 500 Units package are listed for pricing reference; suitability, prescription and dose schedule are decided only by the treating doctor after medical assessment.</p><p className="mt-2 text-[11px] text-ink/55">10 Units: 1,500 EGP · 500 Units package: 20,000 EGP</p></div><div className="text-end"><p className="num text-sm font-bold text-iris-700">1,500 EGP</p><p className="num text-xs text-ink/40 line-through">2,000 EGP</p></div></div></div>
                <div className="px-5 py-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-sm font-semibold text-ink">PROCUT – Tirzepatide</h3><p className="mt-1 text-xs leading-5 text-ink/60">Medication-based weight-management service. The 10 Units option and 200 Units package are listed for pricing reference; suitability, prescription and dose schedule are decided only by the treating doctor after medical assessment.</p><p className="mt-2 text-[11px] text-ink/55">10 Units: 2,500 EGP · 200 Units package: 30,000 EGP</p></div><div className="text-end"><p className="num text-sm font-bold text-iris-700">2,500 EGP</p><p className="num text-xs text-ink/40 line-through">3,000 EGP</p></div></div></div>
                <div className="px-5 py-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-sm font-semibold text-ink">PROCUT PREMIUM – Retatrutide</h3><p className="mt-1 text-xs leading-5 text-ink/60">Doctor-assessed weight-management service. The 10 Units option and 200 Units package are listed for pricing reference; use is subject to the treating doctor's assessment, prescription and monitoring.</p><p className="mt-2 text-[11px] text-ink/55">10 Units: 3,000 EGP · 200 Units package: 35,000 EGP</p></div><div className="text-end"><p className="num text-sm font-bold text-iris-700">3,000 EGP</p><p className="num text-xs text-ink/40 line-through">3,500 EGP</p></div></div></div>
                <div className="px-5 py-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-sm font-semibold text-ink">Mesoline – Body slimming</h3><p className="mt-1 text-xs leading-5 text-ink/60">Local body-slimming injection service. The doctor assesses suitability and determines the treatment area and number of sessions after consultation.</p></div><div className="text-end"><p className="num text-sm font-bold text-iris-700">3,500 EGP</p><p className="num text-xs text-ink/40 line-through">4,000 EGP</p></div></div></div>
              </div>
              <div className="px-5 pb-4"><a href="https://wa.me/201000115502" target="_blank" rel="noreferrer" className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-3 text-sm font-semibold text-white transition hover:brightness-95"><MessageCircle className="h-4 w-4" /> Chat with EVIDA on WhatsApp</a><p className="mt-2 text-[10px] leading-4 text-ink/45">Prices and offers may be updated by the clinic. Medication options are subject to medical assessment and prescription.</p></div>
            </Card>
          </div>
        ) : null}

        {view === "diet" ? (
          <div className="space-y-3">
            {data.dietPlans.length === 0 ? (
              <Card>
                <EmptyState title="No diet plans" hint="Your responsible doctor will add one soon" icon={<Salad className="h-5 w-5" />} />
              </Card>
            ) : (
              data.dietPlans.map((diet) => (
                <DietCard key={diet.id} plan={diet} meals={data.meals.filter((m) => m.dietPlanId === diet.id)} canEdit={false} />
              ))
            )}
          </div>
        ) : null}

        {view === "treatment" ? (
          <div className="space-y-3">
            {data.plans.length === 0 ? (
              <Card>
                <EmptyState title="No treatment plans" icon={<ClipboardList className="h-5 w-5" />} />
              </Card>
            ) : (
              data.plans.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  doses={data.doses.filter((d) => d.planId === plan.id)}
                  doseLogs={data.doseLogs}
                  canEdit={false}
                  canLog
                  onLogDose={(dose) => void logDose(dose.id)}
                />
              ))
            )}

            {data.doseLogs.length > 0 ? (
              <Card>
                <SectionHeader title="Your dose log" icon={<Check className="h-4 w-4" />} />
                <div className="max-h-72 divide-y divide-ink/6 overflow-y-auto">
                  {data.doseLogs.slice(0, 30).map((log) => (
                    <div key={log.id} className="flex items-center justify-between gap-3 px-5 py-2.5">
                      <p className="text-[12px] font-medium text-ink">{"Dose"}</p>
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] text-ink/50">{fmtDateTime(log.takenAt)}</span>
                        <button
                          type="button"
                          onClick={() => run(() => api("DELETE", `/api/dose-logs/${log.id}`), "Log entry removed")}
                          className="rounded p-1 text-ink/35 hover:bg-berry-100 hover:text-berry-600"
                          aria-label="Delete log entry"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ) : null}
          </div>
        ) : null}

        {view === "invoices" ? (
          <div className="space-y-4">
            {myInvoices.length === 0 ? (
              <Card><EmptyState title="No invoices yet" hint="Your invoices will appear here after a completed visit." icon={<ClipboardList className="h-5 w-5" />} /></Card>
            ) : myInvoices.map((invoice) => (
              <Card key={invoice.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-ink">Invoice {invoice.invoiceNumber}</p>
                    <p className="mt-1 text-[11px] text-ink/55">{invoice.appointmentKind ?? "Clinic visit"} · {fmtDate(invoice.createdAt)}</p>
                  </div>
                  <Badge tone={invoice.status === "paid" ? "moss" : invoice.status === "partially_paid" ? "clay" : "berry"}>{invoice.status === "paid" ? "Paid" : invoice.status === "partially_paid" ? "Partially paid" : "Unpaid"}</Badge>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div className="rounded-xl bg-sand-100 p-2"><p className="text-[10px] text-ink/50">Total</p><p className="num text-sm font-bold">{invoice.totalAmount.toLocaleString("en-US")} EGP</p></div>
                  <div className="rounded-xl bg-moss-100/60 p-2"><p className="text-[10px] text-ink/50">Paid</p><p className="num text-sm font-bold">{invoice.paidAmount.toLocaleString("en-US")} EGP</p></div>
                  <div className="rounded-xl bg-clay-100/60 p-2"><p className="text-[10px] text-ink/50">Remaining</p><p className="num text-sm font-bold">{invoice.remainingAmount.toLocaleString("en-US")} EGP</p></div>
                </div>
                {invoice.payments.length > 0 ? <div className="mt-4 border-t border-ink/8 pt-3"><p className="mb-2 text-xs font-semibold text-ink">Payment history</p><div className="space-y-2">{invoice.payments.map((payment) => <div key={payment.id} className="flex justify-between gap-2 text-xs text-ink/65"><span>{payment.method.replace(/_/g, " ")} · {fmtDateTime(payment.paidAt)}</span><strong className="num">{payment.amount.toLocaleString("en-US")} EGP</strong></div>)}</div></div> : null}
                <div className="mt-4 flex justify-end"><Button size="sm" variant="outline" icon={<Printer className="h-4 w-4" />} onClick={() => printInvoice(invoice)} type="button">Print invoice</Button></div>
              </Card>
            ))}
          </div>
        ) : null}

        {view === "records" ? (
          <div className="space-y-3">
            {data.records.length === 0 ? (
              <Card>
                <EmptyState title="No medical records" icon={<Stethoscope className="h-5 w-5" />} />
              </Card>
            ) : (
              data.records.map((record) => <RecordCard key={record.id} record={record} canEdit={false} />)
            )}
          </div>
        ) : null}

        {view === "profile" ? (
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <SectionHeader
                title="My details"
                subtitle="You can update your personal info and measurements"
                icon={<UserCog className="h-4 w-4" />}
                action={
                  <Button size="sm" onClick={() => setProfileModal(true)} type="button">
                    Edit
                  </Button>
                }
              />
              <div className="grid gap-3 px-5 py-4 sm:grid-cols-2">
                <div className="flex items-center gap-3 sm:col-span-2">
                  <Avatar name={me.fullName} hue={me.avatarHue} size={56} />
                  <div>
                    <p className="font-display text-base font-bold text-ink">{me.fullName}</p>
                    <p className="text-xs text-ink/55">{me.email}</p>
                    <Badge tone="pine" className="mt-1">
                      Client account
                    </Badge>
                  </div>
                </div>
                {[
                  { label: "Phone number", value: me.phone ?? "—" },
                  { label: "Date of birth", value: me.birthDate ? fmtDate(me.birthDate) : "—" },
                  { label: "Gender", value: me.gender === "male" ? "Male" : me.gender === "female" ? "Female" : "—" },
                  { label: "Blood type", value: me.bloodType ?? "—" },
                  { label: "Height", value: me.heightCm ? `${me.heightCm} cm` : "—" },
                  { label: "Current weight", value: me.weightKg ? `${me.weightKg} kg` : "—" },
                  { label: "Target weight", value: me.targetWeightKg ? `${me.targetWeightKg} kg` : "—" },
                  { label: "Allergies", value: me.allergies ?? "—" },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl bg-sand-100 px-3.5 py-2.5">
                    <p className="text-[10px] text-ink/50">{item.label}</p>
                    <p className="num mt-0.5 text-[13px] font-semibold text-ink">{item.value}</p>
                  </div>
                ))}
              </div>
            </Card>

            <div className="space-y-4">
              <Card>
                <SectionHeader title="Responsible doctor" icon={<Stethoscope className="h-4 w-4" />} />
                {myDoctor ? (
                  <div className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar name={myDoctor.fullName} hue={myDoctor.avatarHue} size={46} />
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold text-ink">{myDoctor.fullName}</p>
                        <p className="truncate text-[11px] text-ink/55">{myDoctor.specialization ?? "—"}</p>
                      </div>
                    </div>
                    {myDoctor.bio ? <p className="mt-3 text-[11px] leading-5 text-ink/60">{myDoctor.bio}</p> : null}
                    {assignment?.note ? (
                      <p className="mt-3 rounded-lg bg-iris-50 px-3 py-2 text-[11px] text-iris-700">
                        Assignment note: {assignment.note}
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <EmptyState title="No doctor assigned yet" hint="Clinic management will assign one for you" />
                )}
              </Card>

              <Card>
                <SectionHeader title="Weight progress" icon={<Scale className="h-4 w-4" />} />
                <div className="space-y-3 px-5 py-4">
                  {me.weightKg && me.targetWeightKg ? (
                    <>
                      <div>
                        <div className="mb-1 flex justify-between text-[11px] text-ink/55">
                          <span>Target {me.targetWeightKg} kg</span>
                          <span>Current {me.weightKg} kg</span>
                        </div>
                        <Bar
                          value={Math.abs(me.weightKg - me.targetWeightKg)}
                          max={Math.max(me.weightKg, me.targetWeightKg)}
                          tone="bg-clay-500"
                        />
                      </div>
                      <p className="text-[11px] text-ink/55">
                        Current gap: {Math.abs(Math.round((me.weightKg - me.targetWeightKg) * 10) / 10)} kg — update your weight
                        from the Edit button after every measurement.
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-ink/50">Record your weight and height first to see your progress.</p>
                  )}
                </div>
              </Card>
            </div>
          </div>
        ) : null}

        {view === "notifications" ? (
          <Card>
            <SectionHeader
              title="Notifications"
              subtitle={`${data.stats.unreadNotifications} unread`}
              icon={<Bell className="h-4 w-4" />}
              action={
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => run(() => api("PATCH", "/api/notifications/all", {}), "All notifications marked as read")}
                  type="button"
                >
                  Mark all as read
                </Button>
              }
            />
            {data.notifications.length === 0 ? (
              <EmptyState title="No notifications" icon={<Bell className="h-5 w-5" />} />
            ) : (
              <div className="divide-y divide-ink/6">
                {data.notifications.map((n) => (
                  <div key={n.id} className={`flex items-start gap-3 px-5 py-3.5 ${n.readAt ? "opacity-60" : ""}`}>
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.readAt ? "bg-sand-300" : "bg-clay-500"}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[13px] font-semibold text-ink">{n.title}</p>
                        <Badge tone={n.kind === "warning" ? "clay" : "pine"}>{n.kind}</Badge>
                      </div>
                      {n.body ? <p className="mt-0.5 text-[11px] leading-5 text-ink/60">{n.body}</p> : null}
                      <p className="mt-1 text-[10px] text-ink/40">
                        {fmtRelative(n.createdAt)} · {fmtTime(n.createdAt)}
                        {n.actorName ? ` · ${n.actorName}` : ""}
                      </p>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => markRead(n.id, !n.readAt)} type="button">
                      {n.readAt ? "Mark unread" : "Mark read"}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        ) : null}
      </Shell>

      {apptModal.open ? (
        <AppointmentForm
          open
          onClose={() => setApptModal({ open: false })}
          onDone={refresh}
          clients={[me]}
          doctors={data.doctors}
          initial={apptModal.appt ?? null}
          lockClientId={me.id}
          canPickDoctor={false}
          canSetStatus={false}
          defaultDoctorId={myDoctor?.id}
        />
      ) : null}
      {profileModal ? <ProfileForm open onClose={() => setProfileModal(false)} onDone={refresh} me={me} /> : null}
    </>
  );
}
