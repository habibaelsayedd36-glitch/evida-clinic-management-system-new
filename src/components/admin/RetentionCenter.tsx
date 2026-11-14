"use client";

import { useMemo } from "react";
import { CalendarClock, CheckCircle2, Clock3, MessageCircle, RefreshCw, Users } from "lucide-react";
import type { Bootstrap, ProfileDTO } from "@/lib/types";
import { Avatar, Badge, Button, Card, EmptyState, SectionHeader, StatTile } from "@/components/ui";
import { fmtDate } from "@/lib/client";

function phoneForWhatsApp(phone: string) {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = "20" + digits.slice(1);
  return digits;
}

export function RetentionCenter({
  data,
  onOpenClient,
}: {
  data: Bootstrap;
  onOpenClient: (client: ProfileDTO) => void;
}) {
  const followUps = useMemo(() => {
    const today = new Date();
    return data.clients.map((client) => {
      const recordDates = data.records
        .filter((record) => record.clientId === client.id)
        .map((record) => new Date(record.visitDate).getTime());
      const appointmentDates = data.appointments
        .filter((appointment) => appointment.clientId === client.id && appointment.status === "completed")
        .map((appointment) => new Date(appointment.scheduledAt).getTime());
      const dates = [...recordDates, ...appointmentDates].filter(Number.isFinite);
      const lastVisit = dates.length ? Math.max(...dates) : null;
      const daysSince = lastVisit === null ? null : Math.max(0, Math.floor((today.getTime() - lastVisit) / 86_400_000));
      const activePlans = data.plans.filter((plan) => plan.clientId === client.id && plan.status === "active").length;
      const finishedPlans = data.plans.filter((plan) => plan.clientId === client.id && plan.status === "finished").length;
      return { client, lastVisit, daysSince, activePlans, finishedPlans };
    })
      .filter((row) => row.daysSince === null || row.daysSince >= 30)
      .sort((a, b) => (b.daysSince ?? 99999) - (a.daysSince ?? 99999));
  }, [data]);

  const activePrograms = data.plans.filter((plan) => plan.status === "active").length;
  const finishedPrograms = data.plans.filter((plan) => plan.status === "finished").length;
  const withPhone = followUps.filter((row) => Boolean(row.client.phone)).length;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Need follow-up" value={followUps.length} hint="No recorded visit or 30+ days away" icon={<Users className="h-5 w-5" />} tone="clay" />
        <StatTile label="Can contact on WhatsApp" value={withPhone} hint="Clients with a phone number" icon={<MessageCircle className="h-5 w-5" />} />
        <StatTile label="Active programs" value={activePrograms} hint="Treatment plans in progress" icon={<RefreshCw className="h-5 w-5" />} tone="moss" />
        <StatTile label="Completed programs" value={finishedPrograms} hint="Potential maintenance follow-up" icon={<CheckCircle2 className="h-5 w-5" />} />
      </div>

      <Card>
        <SectionHeader
          title="Client comeback list"
          subtitle="Clients with no recorded visit yet or whose last completed visit was at least 30 days ago"
          icon={<CalendarClock className="h-4 w-4" />}
        />
        {followUps.length === 0 ? (
          <EmptyState title="Everyone is up to date" hint="There are no clients currently due for a comeback follow-up." icon={<CheckCircle2 className="h-5 w-5" />} />
        ) : (
          <div className="divide-y divide-ink/6">
            {followUps.map(({ client, lastVisit, daysSince, activePlans: activeCount, finishedPlans: finishedCount }) => {
              const message = encodeURIComponent(
                `Hello ${client.fullName}, this is EVIDA Clinic. We hope you're doing well. We'd love to check in on your progress and help arrange your next follow-up whenever convenient. Reply here and our team will help you.`,
              );
              const wa = client.phone ? `https://wa.me/${phoneForWhatsApp(client.phone)}?text=${message}` : null;
              return (
                <div key={client.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:px-5">
                  <Avatar name={client.fullName} hue={client.avatarHue} size={40} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-ink">{client.fullName}</p>
                      {daysSince === null ? <Badge tone="clay">No visit recorded</Badge> : <Badge tone="clay">{daysSince} days away</Badge>}
                    </div>
                    <p className="mt-1 text-xs text-ink/55">
                      {lastVisit === null ? "No completed visit or medical record found" : `Last visit: ${fmtDate(new Date(lastVisit).toISOString())}`}
                      {" · "}{activeCount} active program{activeCount === 1 ? "" : "s"}
                      {" · "}{finishedCount} completed
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <Button size="sm" variant="outline" onClick={() => onOpenClient(client)} type="button">Open file</Button>
                    {wa ? (
                      <a href={wa} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-2 rounded-xl bg-[#25D366] px-3 text-xs font-semibold text-white transition hover:brightness-95">
                        <MessageCircle className="h-4 w-4" /> WhatsApp
                      </a>
                    ) : (
                      <span className="inline-flex h-9 items-center gap-2 rounded-xl bg-sand-100 px-3 text-xs font-medium text-ink/45"><Clock3 className="h-4 w-4" /> No phone number</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card>
        <SectionHeader title="Program & maintenance overview" subtitle="Use existing treatment plans to track packages, remaining sessions and clients ready for maintenance" icon={<RefreshCw className="h-4 w-4" />} />
        {data.plans.length === 0 ? (
          <EmptyState title="No programs created yet" hint="Doctors can create a treatment plan with total sessions and completion progress from the client's file." />
        ) : (
          <div className="divide-y divide-ink/6">
            {data.plans.slice(0, 12).map((plan) => {
              const remaining = Math.max(0, plan.sessionsTotal - plan.sessionsDone);
              const progress = plan.sessionsTotal > 0 ? Math.min(100, Math.round((plan.sessionsDone / plan.sessionsTotal) * 100)) : 0;
              return (
                <div key={plan.id} className="px-4 py-3.5 sm:px-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div><p className="text-sm font-semibold text-ink">{plan.title}</p><p className="mt-1 text-xs text-ink/55">{plan.clientName} · {plan.doctorName ?? "Care team"}</p></div>
                    <Badge tone={plan.status === "active" ? "pine" : plan.status === "finished" ? "clay" : "neutral"}>{plan.status}</Badge>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-sand-100"><div className="h-full rounded-full bg-iris-500" style={{ width: `${progress}%` }} /></div>
                  <p className="mt-1.5 text-[11px] text-ink/50">{plan.sessionsDone} of {plan.sessionsTotal} sessions completed · {remaining} remaining</p>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
