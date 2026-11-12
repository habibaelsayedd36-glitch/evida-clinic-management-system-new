import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BarChart3,
  Bell,
  CalendarDays,
  ClipboardList,
  Link2,
  MapPin,
  Phone,
  Pill,
  Salad,
  Stethoscope,
} from "lucide-react";
import { getCurrentProfile, getDashboardPath } from "@/lib/auth";
import { Brand } from "@/components/Shell";
import { Badge } from "@/components/ui";

export const dynamic = "force-dynamic";

const HERO =
  "https://images.pexels.com/photos/39192382/pexels-photo-39192382.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200";

const CLINIC = {
  name: "EVIDA Clinic",
  area: "New Cairo",
  address: "Behind GOE Medical Park Mall 3",
  unit: "Clinic 331",
  phone: "01000115502",
};

const FEATURES = [
  { icon: CalendarDays, title: "Appointments", text: "Book, edit and change status, with a full movement log per appointment." },
  { icon: Link2, title: "Client linking", text: "Each client is tied to one responsible doctor, managed by the admin." },
  { icon: ClipboardList, title: "Treatment plans", text: "Sessions done out of total, plan status and doses linked to the plan." },
  { icon: Pill, title: "Doses & adherence", text: "The client logs the dose and the doctor follows the adherence rate." },
  { icon: Salad, title: "Diet plans", text: "A plan with daily calories and meals split across days and times." },
  { icon: Stethoscope, title: "Medical records", text: "Diagnosis, symptoms and vitals (BP, heart rate, temperature, weight)." },
  { icon: BarChart3, title: "Reports", text: "Revenue per doctor, appointment status mix and client adherence." },
  { icon: Bell, title: "Notifications", text: "Automatic alerts on booking, rescheduling, assignment and new plans." },
];

export default async function LandingPage() {
  const me = await getCurrentProfile();
  if (me) redirect(getDashboardPath(me.role));

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-sand-50">
      <div className="pointer-events-none fixed inset-0 grain opacity-80" aria-hidden />

      <header className="relative z-10 border-b border-ink/8 bg-sand-50/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
          <Brand />
          <nav className="hidden items-center gap-6 text-[13px] font-medium text-ink/65 md:flex">
            <a href="#features" className="transition hover:text-iris-700">
              What&apos;s inside
            </a>
            <a href="#contact" className="transition hover:text-iris-700">
              Contact
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/register" className="hidden rounded-lg px-3 py-2 text-[13px] font-semibold text-ink/70 transition hover:bg-sand-100 sm:block">
              New account
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-lg bg-iris-700 px-4 py-2.5 text-[13px] font-semibold text-sand-50 transition hover:bg-iris-800"
            >
              Sign in
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* hero */}
      <section className="relative z-10 mx-auto max-w-6xl px-5 pb-14 pt-12 sm:pt-16">
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <Badge tone="clay">{CLINIC.name} Management System</Badge>
            <h1 className="mt-4 font-display text-4xl font-extrabold leading-[1.2] text-ink sm:text-5xl">
              A complete clinic system,
              <span className="block text-iris-600">with real per-account permissions.</span>
            </h1>
            <p className="mt-5 max-w-xl text-[15px] leading-8 text-ink/65">
              Appointments, treatment plans, diet plans, medical records, dose tracking and reports — all connected to one
              database. The admin manages everything, each doctor only sees the clients assigned to them, and every client
              only sees their own file.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-xl bg-iris-700 px-5 py-3 text-sm font-semibold text-sand-50 shadow-[0_16px_36px_-20px_rgba(59,36,120,1)] transition hover:bg-iris-800"
              >
                Open your dashboard
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-xl border border-ink/15 bg-white/70 px-5 py-3 text-sm font-semibold text-ink transition hover:border-iris-400 hover:text-iris-700"
              >
                Register as a client
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="overflow-hidden rounded-[26px] border border-ink/10 shadow-[0_40px_80px_-50px_rgba(23,18,38,0.8)]">
              <img
                src={HERO}
                alt="A doctor reviewing a patient's case at the clinic"
                className="h-[320px] w-full object-cover sm:h-[420px]"
              />
            </div>
          </div>
        </div>
      </section>

      {/* features */}
      <section id="features" className="relative z-10 border-t border-ink/8 bg-white/70 py-14">
        <div className="mx-auto max-w-6xl px-5">
          <h2 className="font-display text-2xl font-extrabold text-ink">What&apos;s inside</h2>
          <p className="mt-2 text-sm text-ink/60">Every button in these screens performs a real operation against the database.</p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="rounded-2xl border border-ink/8 bg-white/80 p-4 transition hover:border-iris-300">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-iris-50 text-iris-600">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-3 font-display text-[14px] font-bold text-ink">{f.title}</h3>
                  <p className="mt-1.5 text-[12px] leading-6 text-ink/60">{f.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* contact */}
      <section id="contact" className="relative z-10 border-t border-ink/8 bg-white/70 py-14">
        <div className="mx-auto max-w-6xl px-5">
          <div className="overflow-hidden rounded-[26px] border border-ink/8 bg-gradient-to-bl from-iris-700 to-iris-900 text-sand-50">
            <div className="grid gap-8 p-8 sm:p-10 lg:grid-cols-[1.2fr_1fr]">
              <div>
                <p className="text-[11px] tracking-[0.2em] text-iris-200">VISIT THE CLINIC</p>
                <h2 className="mt-3 font-display text-3xl font-extrabold">{CLINIC.name}</h2>
                <div className="mt-6 space-y-3 text-sm text-iris-100">
                  <p className="flex items-start gap-3">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-clay-300" />
                    <span>
                      {CLINIC.area} — {CLINIC.address}
                      <span className="block text-iris-200/80">{CLINIC.unit}</span>
                    </span>
                  </p>
                  <p className="flex items-center gap-3">
                    <Phone className="h-4 w-4 shrink-0 text-clay-300" />
                    <a href={`tel:${CLINIC.phone}`} className="num font-semibold hover:underline">
                      {CLINIC.phone}
                    </a>
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-sand-50/20 bg-iris-900/50 p-6">
                <p className="text-[13px] font-bold">Ready to start?</p>
                <p className="mt-2 text-[12px] leading-6 text-iris-100/85">
                  Sign in with the account your clinic manager gave you, or register as a new client and the team will link
                  you to your doctor.
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-2 rounded-xl bg-sand-50 px-4 py-2.5 text-[13px] font-semibold text-iris-800 transition hover:bg-white"
                  >
                    Sign in
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/register"
                    className="inline-flex items-center gap-2 rounded-xl border border-sand-50/30 px-4 py-2.5 text-[13px] font-semibold text-sand-50 transition hover:bg-sand-50/10"
                  >
                    New client account
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-ink/8 py-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5">
          <Brand />
          <p className="text-[11px] text-ink/45">
            {CLINIC.name} — {CLINIC.area}, {CLINIC.address} · {CLINIC.phone}
          </p>
        </div>
      </footer>
    </div>
  );
}
