import { destroySession } from "@/lib/session";
import { ok } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function POST() {
  await destroySession();
  return ok({ ok: true });
}
