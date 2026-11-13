"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Mail } from "lucide-react";
import { api } from "@/lib/client";
import { Button, Field, Input, ToastProvider, useToast } from "@/components/ui";

function ForgotPasswordForm() {
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("POST", "/api/auth/forgot-password", { email });
      setSent(true);
      toast.push("If the account exists, a reset link has been sent.", "success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send reset email.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-sand-50 px-5 py-10">
      <div className="w-full max-w-md rounded-2xl border border-ink/8 bg-white p-6 shadow-xl">
        <p className="text-xs font-semibold tracking-widest text-iris-600">EVIDA CLINIC</p>
        <h1 className="mt-3 text-2xl font-extrabold text-ink">Forgot password?</h1>
        <p className="mt-2 text-sm leading-6 text-ink/60">Enter the email address linked to your account. We’ll send you a secure reset link.</p>
        {sent ? (
          <div className="mt-6 rounded-xl bg-iris-50 p-4 text-sm leading-6 text-ink">
            If an account exists for this email, you’ll receive a password reset link. Check your inbox and spam folder.
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <Field label="Email">
              <div className="relative">
                <Mail className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/30" />
                <Input className="ps-9" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" required />
              </div>
            </Field>
            {error ? <p role="alert" className="text-sm text-berry-600">{error}</p> : null}
            <Button type="submit" className="w-full" loading={busy} icon={busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}>Send reset link</Button>
          </form>
        )}
        <Link href="/login" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-iris-600 hover:underline"><ArrowLeft className="h-4 w-4" /> Back to sign in</Link>
      </div>
    </main>
  );
}

export default function ForgotPasswordPage() {
  return <ToastProvider><ForgotPasswordForm /></ToastProvider>;
}
