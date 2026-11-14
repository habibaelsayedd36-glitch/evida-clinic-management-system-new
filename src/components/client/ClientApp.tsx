"use client";

import { useMemo, useState } from "react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import {
  Bell,
  Activity,
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
import { EvidaAssistant } from "@/components/client/EvidaAssistant";
import { PatientExperienceHub } from "@/components/PatientExperienceHub";

const NAV: NavItem[] = [
  { id: "home", label: "Home", icon: LayoutDashboard },
  { id: "appointments", label: "My appointments", icon: CalendarDays },
  { id: "services", label: "Services", icon: Salad },
  { id: "diet", label: "Diet plan", icon: Salad },
  { id: "journey", label: "My progress & food diary", icon: Activity },
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
  journey: { title: "My progress & food diary", subtitle: "Track measurements, meals, calories, aftercare and healthy challenges" },
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
  const [payingInvoiceId, setPayingInvoiceId] = useState<string | null>(null);

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
  const pastAppointments = data.appointments.filter((a) => a.status === "completed" || new Date(a.scheduledAt).getTime() <= Date.now());
  const pastRecords = data.records;
  const linkedAppointmentIds = new Set(
    pastRecords.map((record) => record.appointmentId).filter((id): id is string => Boolean(id)),
  );
  const visitHistory = [
    ...pastRecords.map((record) => ({
      type: "record" as const,
      date: new Date(`${String(record.visitDate).slice(0, 10)}T00:00:00`).getTime(),
      record,
    })),
    ...pastAppointments
      .filter((appointment) => !linkedAppointmentIds.has(appointment.id))
      .map((appointment) => ({
        type: "appointment" as const,
        date: new Date(appointment.scheduledAt).getTime(),
        appointment,
      })),
  ].sort((a, b) => b.date - a.date);
  const myInvoices = data.invoices.filter((invoice) => invoice.clientId === me.id);
  const activePlans = data.plans.filter((p) => p.status === "active");
  const activeDiets = data.dietPlans.filter((d) => d.status === "active");
  const activeDoses = data.doses.filter((d) => d.active);
  const value = bmi(me.heightCm, me.weightKg);
  const weightToTarget =
    me.weightKg && me.targetWeightKg ? Math.max(0, Math.round((me.weightKg - me.targetWeightKg) * 10) / 10) : null;

  const weightHistory = [...data.records]
    .filter((record) => typeof record.weightKg === "number" && record.weightKg > 0)
    .sort((a, b) => new Date(a.visitDate).getTime() - new Date(b.visitDate).getTime())
    .slice(-6);
  const chartValues = weightHistory.map((record) => record.weightKg as number);
  const chartMin = chartValues.length ? Math.min(...chartValues) - 1 : 0;
  const chartMax = chartValues.length ? Math.max(...chartValues) + 1 : 1;
  const chartPoints = chartValues.map((weight, index) => ({
    x: chartValues.length === 1 ? 50 : 8 + (index / (chartValues.length - 1)) * 84,
    y: 78 - ((weight - chartMin) / (chartMax - chartMin || 1)) * 58,
    weight,
  }));
  const startingWeight = [...data.records]
    .filter((record) => typeof record.weightKg === "number" && record.weightKg > 0)
    .sort((a, b) => new Date(a.visitDate).getTime() - new Date(b.visitDate).getTime())[0]?.weightKg ?? null;
  const goalProgress = (() => {
    if (!me.weightKg || !me.targetWeightKg || !startingWeight) return null;
    const totalChange = Math.abs(startingWeight - me.targetWeightKg);
    if (totalChange === 0) return me.weightKg === me.targetWeightKg ? 100 : 0;
    const achievedChange = startingWeight > me.targetWeightKg ? startingWeight - me.weightKg : me.weightKg - startingWeight;
    return Math.min(100, Math.max(0, Math.round((achievedChange / totalChange) * 100)));
  })();
  const goalRemaining = me.weightKg && me.targetWeightKg ? Math.round(Math.abs(me.weightKg - me.targetWeightKg) * 10) / 10 : null;

  async function printInvoice(invoice: InvoiceDTO) {
    try {
      const pdf = await PDFDocument.create();
      const page = pdf.addPage([595.28, 841.89]);
      const regular = await pdf.embedFont(StandardFonts.Helvetica);
      const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
      const purple = rgb(0.318, 0.267, 0.467);
      const ink = rgb(0.14, 0.13, 0.22);
      const muted = rgb(0.45, 0.45, 0.48);
      const pale = rgb(0.965, 0.957, 0.94);
      const left = 48;
      const right = 547;
      let y = 790;
      const draw = (value: string, x: number, top: number, size = 10, font = regular, color = ink) => {
        page.drawText(value, { x, y: top, size, font, color, maxWidth: right - x });
      };
      const line = (top: number, color = rgb(0.89, 0.88, 0.86)) => {
        page.drawLine({ start: { x: left, y: top }, end: { x: right, y: top }, thickness: 0.8, color });
      };
      const money = (amount: number) => amount.toLocaleString("en-US") + " EGP";
      draw("EVIDA CLINIC", left, y, 22, bold, purple);
      draw("INVOICE", 450, y + 2, 10, bold, muted);
      draw("Nutrition & Dermatology", left, y - 18, 10, regular, muted);
      draw(invoice.invoiceNumber, 350, y - 18, 9, bold, ink);
      line(y - 34, purple);
      y -= 76;
      draw("INVOICE DETAILS", left, y, 9, bold, purple);
      draw("Issued " + fmtDate(invoice.createdAt), left, y - 18, 10, regular, muted);
      y -= 52;
      page.drawRectangle({ x: left, y: y - 76, width: right - left, height: 88, color: pale });
      draw("CLIENT", left + 14, y - 8, 8, bold, muted);
      draw(me.fullName, left + 14, y - 27, 12, bold);
      draw(me.email ?? "", left + 14, y - 44, 9, regular, muted);
      draw(me.phone ?? "", left + 14, y - 59, 9, regular, muted);
      draw("SERVICE", 330, y - 8, 8, bold, muted);
      draw(invoice.appointmentKind ?? "Clinic visit", 330, y - 27, 11, bold);
      draw("Invoice: " + invoice.invoiceNumber, 330, y - 44, 8, regular, muted);
      y -= 112;
      draw("PAYMENT HISTORY", left, y, 10, bold, purple);
      y -= 22;
      page.drawRectangle({ x: left, y: y - 20, width: right - left, height: 24, color: pale });
      draw("DATE", left + 8, y - 12, 8, bold, muted);
      draw("PAYMENT METHOD", 260, y - 12, 8, bold, muted);
      draw("AMOUNT", 465, y - 12, 8, bold, muted);
      y -= 40;
      if (invoice.payments.length === 0) {
        draw("No payments recorded", left + 8, y, 9, regular, muted);
        y -= 22;
      } else {
        for (const payment of invoice.payments) {
          draw(fmtDateTime(payment.paidAt), left + 8, y, 8, regular);
          draw(payment.method.replace(/_/g, " "), 260, y, 8, regular);
          draw(money(payment.amount), 455, y, 8, bold);
          y -= 22;
        }
      }
      line(y);
      y -= 28;
      const totalRows = [
        ["Total", money(invoice.totalAmount), false],
        ["Paid", money(invoice.paidAmount), false],
        ["Remaining", money(invoice.remainingAmount), true],
      ] as const;
      for (const [label, value, emphasized] of totalRows) {
        page.drawRectangle({ x: 330, y: y - 10, width: 217, height: 28, color: pale });
        draw(label, 342, y, 9, emphasized ? bold : regular, emphasized ? purple : ink);
        draw(value, 445, y, 9, bold, emphasized ? purple : ink);
        y -= 36;
      }
      line(82);
      draw("Thank you for choosing EVIDA CLINIC", left, 62, 9, regular, muted);
      const bytes = await pdf.save();
      const pdfBuffer = new ArrayBuffer(bytes.byteLength);
      new Uint8Array(pdfBuffer).set(bytes);
      const blob = new Blob([pdfBuffer], { type: "application/pdf" });
      const file = new File([blob], invoice.invoiceNumber + ".pdf", { type: "application/pdf" });

      if (typeof navigator.share === "function" && typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: "EVIDA Clinic Invoice" });
        return;
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = invoice.invoiceNumber + ".pdf";
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      console.error("[invoice PDF]", error);
      window.alert("Could not create the invoice PDF. Please try again.");
    }
  }

  async function payInvoice(invoice: InvoiceDTO) {
    setPayingInvoiceId(invoice.id);
    try {
      const result = await api<{ checkoutUrl: string }>("POST", "/api/payments/paymob/checkout", { invoiceId: invoice.id });
      window.location.assign(result.checkoutUrl);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Could not start the payment. Please try again.");
      setPayingInvoiceId(null);
    }
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
          <div className="space-y-6 pb-8">
            <section className="relative isolate overflow-hidden rounded-[2rem] bg-[#211b35] px-6 py-7 text-white shadow-[0_24px_60px_-30px_rgba(33,27,53,.55)] sm:px-9 sm:py-9">
              <div className="pointer-events-none absolute -right-12 -top-24 -z-10 h-72 w-72 rounded-full border-[36px] border-white/[0.06]" />
              <div className="pointer-events-none absolute -bottom-32 right-1/3 -z-10 h-64 w-64 rounded-full bg-[#8c789e]/20 blur-3xl" />
              <div className="flex flex-wrap items-start justify-between gap-6">
                <div className="max-w-xl">
                  <p className="text-[10px] font-semibold uppercase tracking-[.28em] text-[#d8c9e8]">EVIDA · YOUR WELLNESS SPACE</p>
                  <h2 className="mt-3 font-display text-3xl font-semibold leading-tight tracking-tight sm:text-[2.7rem]">A healthier you,<br /><span className="text-[#d8c9e8]">one step at a time.</span></h2>
                  <p className="mt-3 max-w-md text-sm leading-6 text-white/65">Your appointments, care plans and progress — thoughtfully brought together in one place.</p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <Button onClick={() => setApptModal({ open: true })} type="button" className="!rounded-full !bg-[#e8dced] !px-5 !text-[#302542] hover:!bg-white">Book an appointment <CalendarPlus className="ml-2 h-4 w-4" /></Button>
                    <button type="button" onClick={() => setView("profile")} className="rounded-full border border-white/20 px-5 py-2.5 text-xs font-semibold text-white/85 transition hover:bg-white/10">View my profile</button>
                  </div>
                </div>
                <div className="min-w-[220px] rounded-2xl border border-white/10 bg-white/[0.07] p-4 backdrop-blur-sm sm:min-w-[250px]">
                  <div className="flex items-center gap-3">
                    {myDoctor ? <Avatar name={myDoctor.fullName} hue={myDoctor.avatarHue} size={44} /> : <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10"><Stethoscope className="h-5 w-5 text-[#d8c9e8]" /></div>}
                    <div className="min-w-0"><p className="text-[10px] uppercase tracking-wider text-white/45">Your care team</p><p className="mt-1 truncate text-sm font-semibold">{myDoctor?.fullName ?? "Your doctor"}</p><p className="mt-0.5 text-[11px] text-white/55">{myDoctor?.specialization ?? "Your clinic team"}</p></div>
                  </div>
                  <div className="mt-4 border-t border-white/10 pt-3">
                    <p className="text-[10px] uppercase tracking-wider text-white/45">Next appointment</p>
                    {next ? <><p className="mt-1 text-sm font-semibold">{fmtDate(next.scheduledAt)}</p><p className="mt-0.5 text-xs text-white/55">{fmtTime(next.scheduledAt)} · {next.kind}</p></> : <p className="mt-1 text-sm text-white/65">Nothing scheduled yet</p>}
                  </div>
                </div>
              </div>
            </section>

            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-[#e9e3ec] bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><span className="text-[11px] font-medium text-ink/50">Current weight</span><Scale className="h-4 w-4 text-[#806b91]" /></div><p className="num mt-3 text-2xl font-semibold text-ink">{me.weightKg ?? "—"}{me.weightKg ? <span className="ml-1 text-xs font-medium text-ink/45">kg</span> : null}</p><p className="mt-1 text-[10px] text-ink/40">{weightToTarget !== null ? `${weightToTarget} kg to your goal` : "Your latest measurement"}</p></div>
              <div className="rounded-2xl border border-[#e9e3ec] bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><span className="text-[11px] font-medium text-ink/50">Body mass index</span><HeartPulse className="h-4 w-4 text-[#806b91]" /></div><p className="num mt-3 text-2xl font-semibold text-ink">{value ?? "—"}</p><p className="mt-1 text-[10px] text-ink/40">{bmiLabel(value) ?? "Based on your measurements"}</p></div>
              <div className="rounded-2xl border border-[#e9e3ec] bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><span className="text-[11px] font-medium text-ink/50">Active treatment doses</span><Pill className="h-4 w-4 text-[#806b91]" /></div><p className="num mt-3 text-2xl font-semibold text-ink">{activeDoses.length}</p><p className="mt-1 text-[10px] text-ink/40">{data.doseLogs.length} doses recorded</p></div>
              <div className="rounded-2xl border border-[#e9e3ec] bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><span className="text-[11px] font-medium text-ink/50">Appointments</span><CalendarDays className="h-4 w-4 text-[#806b91]" /></div><p className="num mt-3 text-2xl font-semibold text-ink">{upcoming.length}</p><p className="mt-1 text-[10px] text-ink/40">Upcoming visits</p></div>
            </section>

            <section className="grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
              <Card className="overflow-hidden !rounded-[1.6rem] !border-[#e9e3ec] !shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5 sm:px-6">
                  <div><p className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#927fa0]">Your progress</p><h3 className="mt-1 font-display text-xl font-semibold text-ink">Weight journey</h3><p className="mt-1 text-xs text-ink/45">A look at your recorded measurements</p></div>
                  {me.targetWeightKg ? <Badge tone="pine">Goal · {me.targetWeightKg} kg</Badge> : null}
                </div>
                {chartPoints.length > 1 ? <div className="px-4 pb-4 pt-2 sm:px-6"><div className="mb-1 flex items-end justify-between"><p className="num text-3xl font-semibold text-ink">{me.weightKg ?? "—"}<span className="ml-1 text-sm font-medium text-ink/40">kg</span></p><p className="text-[10px] text-ink/40">{weightHistory.length} measurements</p></div><svg viewBox="0 0 100 90" className="h-40 w-full overflow-visible" role="img" aria-label="Weight trend chart">{[20,49,78].map(y=><line key={y} x1="7" x2="94" y1={y} y2={y} stroke="#eee8f0" strokeDasharray="1.5 2" strokeWidth=".6" />)}<polyline points={chartPoints.map(p=>p.x+","+p.y).join(" ")} fill="none" stroke="#806b91" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />{chartPoints.map((p,i)=><g key={i}><circle cx={p.x} cy={p.y} r="2.4" fill="#fff" stroke="#806b91" strokeWidth="1.4" /><text x={p.x} y={p.y-5} textAnchor="middle" fontSize="3.5" fill="#514477" fontWeight="600">{p.weight}</text></g>)}</svg><div className="flex justify-between text-[9px] text-ink/40"><span>{fmtDate(weightHistory[0].visitDate)}</span><span>{fmtDate(weightHistory[weightHistory.length-1].visitDate)}</span></div></div> : <div className="mx-5 mb-5 mt-4 rounded-2xl bg-[#f8f5f9] px-4 py-7 text-center"><Scale className="mx-auto h-6 w-6 text-[#9a88a5]" /><p className="mt-2 text-sm font-semibold text-ink/70">Your progress chart starts here</p><p className="mt-1 text-xs text-ink/45">Your chart will grow as your care team records new measurements.</p></div>}
              </Card>

              <Card className="!rounded-[1.6rem] !border-[#e9e3ec] !shadow-sm">
                <div className="flex items-start justify-between gap-3 px-5 pt-5"><div><p className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#927fa0]">Your next step</p><h3 className="mt-1 font-display text-xl font-semibold text-ink">Next appointment</h3></div><CalendarDays className="h-5 w-5 text-[#806b91]" /></div>
                {next ? <div className="px-5 pb-5 pt-4"><div className="rounded-2xl bg-[#f5f0f6] p-4"><p className="text-[10px] font-semibold uppercase tracking-wider text-[#806b91]">{next.kind}</p><p className="mt-2 font-display text-2xl font-semibold text-ink">{fmtDate(next.scheduledAt)}</p><p className="mt-1 text-sm text-ink/60">{fmtTime(next.scheduledAt)} · {next.durationMin} min</p><p className="mt-1 text-xs text-ink/45">{next.location ?? "EVIDA Clinic"}</p></div><div className="mt-4 flex flex-wrap gap-2"><Button size="sm" onClick={()=>setView("appointments")} type="button">Appointment details</Button><Button size="sm" variant="outline" onClick={()=>cancel(next)} type="button">Cancel</Button></div></div> : <div className="px-5 pb-5 pt-4"><div className="rounded-2xl border border-dashed border-[#ded4e3] bg-[#faf8fb] px-4 py-7 text-center"><CalendarPlus className="mx-auto h-6 w-6 text-[#9a88a5]" /><p className="mt-2 text-sm font-semibold text-ink/70">No visits booked</p><p className="mt-1 text-xs text-ink/45">Whenever you're ready, book your next visit.</p><Button size="sm" className="mt-4" onClick={()=>setApptModal({open:true})} type="button">Book a visit</Button></div></div>}
              </Card>
            </section>

            {me.targetWeightKg ? <section className="rounded-[1.6rem] border border-[#e9e3ec] bg-[#f5f0f6] p-5 sm:p-6"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#806b91]">Personal target</p><h3 className="mt-1 font-display text-xl font-semibold text-ink">Your goal, your pace.</h3></div><p className="num text-2xl font-semibold text-ink">{goalRemaining ?? "—"} <span className="text-xs font-medium text-ink/45">kg to go</span></p></div><div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white"><div className="h-full rounded-full bg-[#806b91] transition-all" style={{width: String(goalProgress ?? 0)+"%"}} /></div><div className="mt-2 flex justify-between text-[10px] text-ink/45"><span>{startingWeight ?? "—"} kg starting</span><span>{me.targetWeightKg} kg target</span></div></section> : null}

            <section className="grid gap-5 lg:grid-cols-2">
              <Card className="!rounded-[1.6rem] !border-[#e9e3ec] !shadow-sm">
                <div className="flex items-center justify-between gap-3 px-5 pt-5"><div><p className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#927fa0]">Daily care</p><h3 className="mt-1 font-display text-lg font-semibold text-ink">Dose schedule</h3></div><button type="button" onClick={()=>setView("treatment")} className="text-[11px] font-semibold text-[#806b91]">View plan →</button></div>
                {activeDoses.length ? <div className="divide-y divide-[#eee8f0] px-5 pb-2 pt-3">{activeDoses.slice(0,4).map(dose=>{const taken=data.doseLogs.some(l=>l.doseId===dose.id&&isSameDay(l.takenAt));return <div key={dose.id} className="flex items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="text-sm font-semibold text-ink">{dose.dosage||"Dose"}</p><p className="mt-1 text-[11px] text-ink/45">{dose.frequency??"As prescribed"} · {dose.timeOfDay?TIME_LABELS[dose.timeOfDay]??dose.timeOfDay:"Scheduled"}</p></div><Button size="sm" variant={taken?"soft":"outline"} disabled={taken} onClick={()=>taken?undefined:logDose(dose.id)} type="button">{taken?"Taken":"Log dose"}</Button></div>})}</div> : <div className="px-5 pb-5 pt-4"><EmptyState title="No active doses" hint="Your doctor will add your schedule here." icon={<Pill className="h-5 w-5" />} /></div>}
              </Card>
              <Card className="!rounded-[1.6rem] !border-[#e9e3ec] !shadow-sm">
                <div className="flex items-center justify-between gap-3 px-5 pt-5"><div><p className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#927fa0]">Nutrition</p><h3 className="mt-1 font-display text-lg font-semibold text-ink">Today's meals</h3></div><button type="button" onClick={()=>setView("diet")} className="text-[11px] font-semibold text-[#806b91]">Full diet plan →</button></div>
                {activeDiets.length===0 ? <div className="px-5 pb-5 pt-4"><EmptyState title="No active diet plan" hint="Your personalized plan will appear here." icon={<Salad className="h-5 w-5" />} /></div> : todaysMeals.length===0 ? <div className="px-5 pb-5 pt-4"><EmptyState title="No meals added yet" hint="Your doctor hasn't uploaded meals for this plan." icon={<UtensilsCrossed className="h-5 w-5" />} /></div> : <div className="divide-y divide-[#eee8f0] px-5 pb-2 pt-3">{todaysMeals.slice(0,4).map(meal=><div key={meal.id} className="py-3"><div className="flex items-center justify-between gap-2"><p className="text-sm font-semibold text-ink">{TIME_LABELS[meal.timeOfDay]??meal.timeOfDay} · {meal.name}</p>{meal.calories?<Badge tone="moss">{meal.calories} kcal</Badge>:null}</div>{meal.items?<p className="mt-1 text-xs leading-5 text-ink/55">{meal.items}</p>:null}</div>)}</div>}
              </Card>
            </section>

            <Card className="!rounded-[1.6rem] !border-[#e9e3ec] !shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5"><div><p className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#927fa0]">Treatment overview</p><h3 className="mt-1 font-display text-lg font-semibold text-ink">Your active protocols</h3></div><button type="button" onClick={()=>setView("treatment")} className="text-[11px] font-semibold text-[#806b91]">See all →</button></div>
              {activePlans.length===0 ? <div className="px-5 pb-5 pt-4"><EmptyState title="No active treatment protocol" hint="Your care team will add your plan here." icon={<ClipboardList className="h-5 w-5" />} /></div> : <div className="grid gap-3 px-5 pb-5 pt-4 sm:grid-cols-2">{activePlans.map(plan=><div key={plan.id} className="rounded-2xl bg-[#f8f5f9] p-4"><div className="flex items-start justify-between gap-3"><p className="text-sm font-semibold text-ink">{plan.title}</p><Badge tone="pine">Active</Badge></div><div className="mt-3"><Progress value={plan.sessionsDone} total={plan.sessionsTotal} /><p className="num mt-2 text-[10px] text-ink/45">{plan.sessionsDone} / {plan.sessionsTotal} sessions completed</p></div></div>)}</div>}
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
              <SectionHeader title="Visit history" subtitle="Previous visits and appointment status" icon={<ClipboardList className="h-4 w-4" />} />
              {visitHistory.length === 0 ? (
                <EmptyState title="No previous visits" />
              ) : (
                visitHistory.map((item) =>
                  item.type === "record" ? (
                    <div key={`record-${item.record.id}`} className="mb-2 rounded-xl border border-ink/8 bg-white px-3.5 py-3 last:mb-0">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-[13px] font-semibold text-ink">{item.record.title}</p>
                          <p className="mt-0.5 text-[11px] text-ink/55">{fmtDate(item.record.visitDate)} · {item.record.doctorName ?? "Clinic visit"}</p>
                        </div>
                        <Badge tone="pine">Visit recorded</Badge>
                      </div>
                      {item.record.diagnosis ? <p className="mt-2 text-xs leading-5 text-ink/65">{item.record.diagnosis}</p> : null}
                    </div>
                  ) : (
                    <AppointmentRow key={item.appointment.id} appt={item.appointment} showDoctor canEdit={false} />
                  ),
                )
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
                <div className="mt-4 flex flex-wrap justify-end gap-2">
                  {invoice.remainingAmount > 0 ? (
                    <Button size="sm" onClick={() => void payInvoice(invoice)} disabled={payingInvoiceId === invoice.id} type="button">
                      {payingInvoiceId === invoice.id ? "Opening secure checkout…" : `Pay now · ${invoice.remainingAmount.toLocaleString("en-US")} EGP`}
                    </Button>
                  ) : null}
                  <Button size="sm" variant="outline" icon={<Printer className="h-4 w-4" />} onClick={() => printInvoice(invoice)} type="button">Print invoice</Button>
                </div>
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

        {view === "journey" ? <PatientExperienceHub data={data} mode="client" /> : null}

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

      <EvidaAssistant context={{ calorieTarget: activeDiets[0]?.dailyCalories ?? null, currentWeight: me.weightKg, nextAppointment: next ? fmtDate(next.scheduledAt) + " at " + fmtTime(next.scheduledAt) : null, activePlans: activePlans.length }} />

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
