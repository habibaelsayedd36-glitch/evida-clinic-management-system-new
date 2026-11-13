"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, KeyRound, Loader2, Lock } from "lucide-react";
import { api } from "@/lib/client";
import { Button, Field, Input, ToastProvider, useToast } from "@/components/ui";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (password !== confirm) { setError("Passwords do not match."); return; }
    setBusy(true);
    setError(null);
    try {
      const result = await api<{ message: string }>("POST", "/api/auth/reset-password", { token, password });
      toast.push(result.message, "success");
      router.replace("/login?passwordReset=success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-sand-50 px-5 py-10">
      <div className="w-full max-w-md rounded-2xl border border-ink/8 bg-white p-6 shadow-xl">
        <p className="text-xs font-semibold tracking-widest text-iris-600">EVIDA CLINIC</p>
        <h1 className="mt-3 text-2xl font-extrabold text-ink">Create a new password</h1>
        <p className="mt-2 text-sm leading-6 text-ink/60">Choose a new password with at least 8 characters.</p>
        {!token ? <p role="alert" className="mt-5 rounded-xl bg-berry-100 p-3 text-sm text-berry-600">This reset link is missing or invalid. Request a new one.</p> : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <Field label="New password">
              <div className="relative"><Lock className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/30" /><Input className="ps-9" type="password" minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
            </Field>
            <Field label="Confirm new password">
              <div className="relative"><Lock className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/30" /><Input className="ps-9" type="password" minLength={8} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required /></div>
            </Field>
            {error ? <p role="alert" className="text-sm text-berry-600">{error}</p> : null}
            <Button type="submit" className="w-full" loading={busy} icon={busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}>Update password</Button>
          </form>
        )}
        <Link href="/login" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-iris-600 hover:underline"><ArrowLeft className="h-4 w-4" /> Back to sign in</Link>
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return <ToastProvider><Suspense fallback={<main className="flex min-h-screen items-center justify-center bg-sand-50 text-sm text-ink/60">Loading…</main>}><ResetPasswordForm /></Suspense></ToastProvider>;
}
