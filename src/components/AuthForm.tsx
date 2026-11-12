"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, KeyRound, Loader2, Lock, Mail, Phone, User } from "lucide-react";
import { api } from "@/lib/client";
import { Brand } from "./Shell";
import { Button, Field, Input, Select, useToast } from "./ui";

const HERO_IMAGE =
  "https://images.pexels.com/photos/39192382/pexels-photo-39192382.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200";

export function AuthForm({ mode, next }: { mode: "login" | "register"; next?: string }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    email: "",
    password: "",
    fullName: "",
    phone: "",
    gender: "female",
    birthDate: "",
    heightCm: "",
    weightKg: "",
    targetWeightKg: "",
  });

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [key]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ redirect: string }>(
        "POST",
        mode === "login" ? "/api/auth/login" : "/api/auth/register",
        form,
      );
      toast.push(mode === "login" ? "Signed in successfully" : "Your account was created — welcome", "success");
      const target = mode === "login" ? (next || res.redirect || "/client") : "/client";
      router.push(target);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
      toast.push(message, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative min-h-screen lg:grid lg:grid-cols-[1.05fr_1fr]">
      <div className="pointer-events-none fixed inset-0 grain opacity-80" aria-hidden />

      {/* visual side */}
      <div className="relative hidden overflow-hidden bg-iris-800 lg:block">
        <img
          src={HERO_IMAGE}
          alt="A doctor reviewing a patient's file at EVIDA clinic"
          className="absolute inset-0 h-full w-full object-cover opacity-45"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-iris-900 via-iris-800/80 to-iris-700/40" />
        <div className="relative flex h-full flex-col justify-between p-10 text-sand-50">
          <div className="[&_span]:text-sand-50">
            <Brand />
          </div>

          <div className="max-w-md">
            <p className="text-[11px] tracking-[0.2em] text-iris-100/70">EVIDA CLINIC MANAGEMENT</p>
            <h2 className="mt-3 font-display text-3xl font-extrabold leading-snug">
              Every client has a file, every doctor sees only their own clients, and the admin sees the full picture.
            </h2>
            <p className="mt-4 text-sm leading-7 text-iris-100/85">
              One system for appointments, treatment plans, diet plans and medical records — with access control
              applied per account, so nobody can reach data that isn&apos;t theirs.
            </p>

            <ul className="mt-7 space-y-2.5 text-[13px] text-iris-100/90">
              {[
                "Admin: manage clients, staff, assignments and reports",
                "Doctor: only assigned clients — appointments, plans and records",
                "Client: their own file only — appointments, diet, treatment and doses",
              ].map((line) => (
                <li key={line} className="flex items-start gap-2.5">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-clay-300" />
                  {line}
                </li>
              ))}
            </ul>
          </div>

          <p className="text-[11px] text-iris-100/60">
            © {new Date().getFullYear()} EVIDA Clinic — New Cairo · 01000115502
          </p>
        </div>
      </div>

      {/* form side */}
      <div className="relative flex min-h-screen items-center justify-center px-5 py-10">
        <div className="w-full max-w-md">
          <div className="mb-6 lg:hidden">
            <Brand />
          </div>

          <h1 className="font-display text-2xl font-extrabold text-ink">
            {mode === "login" ? "Sign in" : "Create a client account"}
          </h1>
          <p className="mt-1.5 text-sm text-ink/55">
            {mode === "login"
              ? "Enter your email and password — the system opens the dashboard that matches your role."
              : "New accounts are created as clients. The admin is the one who links you to a responsible doctor."}
          </p>

          <form
            onSubmit={submit}
            className="mt-6 space-y-4 rounded-2xl border border-ink/8 bg-white/85 p-5 shadow-[0_24px_60px_-40px_rgba(23,18,38,0.6)]"
          >
            {mode === "register" ? (
              <>
                <Field label="Full name">
                  <div className="relative">
                    <User className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/30" />
                    <Input className="ps-9" value={form.fullName} onChange={set("fullName")} placeholder="e.g. Ahmed Mahmoud" required />
                  </div>
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Phone number">
                    <div className="relative">
                      <Phone className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/30" />
                      <Input className="ps-9" value={form.phone} onChange={set("phone")} placeholder="01xxxxxxxxx" />
                    </div>
                  </Field>
                  <Field label="Gender">
                    <Select value={form.gender} onChange={set("gender")}>
                      <option value="female">Female</option>
                      <option value="male">Male</option>
                    </Select>
                  </Field>
                  <Field label="Date of birth">
                    <Input type="date" value={form.birthDate} onChange={set("birthDate")} />
                  </Field>
                  <Field label="Height (cm)">
                    <Input type="number" value={form.heightCm} onChange={set("heightCm")} />
                  </Field>
                  <Field label="Current weight (kg)">
                    <Input type="number" step="0.1" value={form.weightKg} onChange={set("weightKg")} />
                  </Field>
                  <Field label="Target weight (kg)">
                    <Input type="number" step="0.1" value={form.targetWeightKg} onChange={set("targetWeightKg")} />
                  </Field>
                </div>
              </>
            ) : null}

            <Field label="Email">
              <div className="relative">
                <Mail className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/30" />
                <Input
                  className="ps-9"
                  type="email"
                  value={form.email}
                  onChange={set("email")}
                  placeholder="name@evida.clinic"
                  required
                />
              </div>
            </Field>

            <Field label="Password" hint={mode === "register" ? "At least 8 characters" : undefined}>
              <div className="relative">
                <Lock className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/30" />
                <Input
                  className="ps-9"
                  type="password"
                  value={form.password}
                  onChange={set("password")}
                  required
                  minLength={mode === "register" ? 8 : undefined}
                />
              </div>
            </Field>

            {error ? (
              <p className="rounded-xl border border-berry-500/25 bg-berry-100 px-3.5 py-2.5 text-xs font-medium text-berry-600">
                {error}
              </p>
            ) : null}

            <Button
              type="submit"
              className="w-full"
              loading={busy}
              icon={busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
            >
              {mode === "login" ? "Sign in" : "Create account"}
            </Button>

            <p className="text-center text-xs text-ink/55">
              {mode === "login" ? (
                <>
                  Don&apos;t have an account yet?{" "}
                  <Link href="/register" className="font-semibold text-iris-600 hover:underline">
                    Register as a new client
                  </Link>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <Link href="/login" className="font-semibold text-iris-600 hover:underline">
                    Sign in
                  </Link>
                </>
              )}
            </p>
          </form>

          <p className="mt-5 text-center text-[11px] leading-5 text-ink/45">
            EVIDA Clinic — New Cairo, behind GOE Medical Park Mall 3, clinic 331
            <span className="num block font-medium text-ink/60">01000115502</span>
          </p>
        </div>
      </div>
    </div>
  );
}
