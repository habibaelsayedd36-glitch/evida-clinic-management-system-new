import { redirect } from "next/navigation";
import { getCurrentProfile, getDashboardPath } from "@/lib/auth";
import { ToastProvider } from "@/components/ui";
import { AuthForm } from "@/components/AuthForm";

export const dynamic = "force-dynamic";

export const metadata = { title: "Create account | EVIDA" };

export default async function RegisterPage() {
  const me = await getCurrentProfile();
  if (me) redirect(getDashboardPath(me.role));

  return (
    <ToastProvider>
      <AuthForm mode="register" />
    </ToastProvider>
  );
}
