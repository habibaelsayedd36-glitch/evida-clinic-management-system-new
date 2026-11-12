import { redirect } from "next/navigation";
import { getCurrentProfile, getDashboardPath } from "@/lib/auth";
import { ToastProvider } from "@/components/ui";
import { AuthForm } from "@/components/AuthForm";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const me = await getCurrentProfile();
  if (me) redirect(getDashboardPath(me.role));
  const { next } = await searchParams;

  return (
    <ToastProvider>
      <AuthForm mode="login" next={next} />
    </ToastProvider>
  );
}
