import type { NextRequest } from "next/server";
import { fail, ok, withGuards } from "@/lib/api-helpers";
import {
  createAppointment,
  createInvoicePayment,
  awardInvoiceRewards,
  createDietPlan,
  createDose,
  createDoseLog,
  createMeal,
  createPlan,
  createProfile,
  createRecord,
  sendNotification,
  upsertAssignment,
} from "@/lib/mutations";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ resource: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  const { resource } = await ctx.params;
  return withGuards(async (user, body) => {
    switch (resource) {
      case "clients":
        return ok(await createProfile(user, { ...body, role: "client" }), 201);
      case "doctors":
        return ok(await createProfile(user, { ...body, role: "doctor" }), 201);
      case "staff":
        return ok(await createProfile(user, body), 201);
      case "assignments":
        return ok(await upsertAssignment(user, body), 201);
      case "appointments":
        return ok(await createAppointment(user, body), 201);
      case "invoice-payments":
        return ok(await createInvoicePayment(user, body), 201);
      case "rewards":
        return ok(await awardInvoiceRewards(user, body), 201);
      case "medical-records":
        return ok(await createRecord(user, body), 201);
      case "treatment-plans":
        return ok(await createPlan(user, body), 201);
      case "medication-doses":
        return ok(await createDose(user, body), 201);
      case "diet-plans":
        return ok(await createDietPlan(user, body), 201);
      case "diet-meals":
        return ok(await createMeal(user, body), 201);
      case "dose-logs":
        return ok(await createDoseLog(user, body), 201);
      case "notifications":
        return ok(await sendNotification(user, body), 201);
      default:
        return fail("Unknown resource", 404);
    }
  }, req, {});
}
