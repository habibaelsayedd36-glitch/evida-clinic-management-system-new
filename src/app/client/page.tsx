import { redirect } from "next/navigation";
import { getCurrentProfile, getDashboardPath } from "@/lib/auth";
import { loadScopedData } from "@/lib/queries";
import { ToastProvider } from "@/components/ui";
import { ClientApp } from "@/components/client/ClientApp";

export const dynamic = "force-dynamic";

export const metadata = { title: "My Account | EVIDA" };

export default async function ClientPage() {
  const me = await getCurrentProfile();
  if (!me) redirect("/login?next=/client");
  if (me.role !== "client") redirect(getDashboardPath(me.role));

  const data = await loadScopedData(me);

  return (
    <ToastProvider>
      <ClientApp initial={data} />
    </ToastProvider>
  );
}
