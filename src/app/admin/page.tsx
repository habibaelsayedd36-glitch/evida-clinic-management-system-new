import { redirect } from "next/navigation";
import { getCurrentProfile, getDashboardPath } from "@/lib/auth";
import { loadScopedData } from "@/lib/queries";
import { ToastProvider } from "@/components/ui";
import { AdminApp } from "@/components/admin/AdminApp";

export const dynamic = "force-dynamic";

export const metadata = { title: "Admin Dashboard | EVIDA" };

export default async function AdminPage() {
  const me = await getCurrentProfile();
  if (!me) redirect("/login?next=/admin");
  if (me.role !== "admin") redirect(getDashboardPath(me.role));

  const data = await loadScopedData(me);

  return (
    <ToastProvider>
      <AdminApp initial={data} />
    </ToastProvider>
  );
}
