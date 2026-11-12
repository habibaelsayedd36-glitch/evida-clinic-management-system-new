import { redirect } from "next/navigation";
import { getCurrentProfile, getDashboardPath } from "@/lib/auth";
import { loadScopedData } from "@/lib/queries";
import { ToastProvider } from "@/components/ui";
import { DoctorApp } from "@/components/doctor/DoctorApp";

export const dynamic = "force-dynamic";

export const metadata = { title: "Doctor Dashboard | EVIDA" };

export default async function DoctorPage() {
  const me = await getCurrentProfile();
  if (!me) redirect("/login?next=/doctor");
  if (me.role !== "doctor") redirect(getDashboardPath(me.role));

  const data = await loadScopedData(me);

  return (
    <ToastProvider>
      <DoctorApp initial={data} />
    </ToastProvider>
  );
}
