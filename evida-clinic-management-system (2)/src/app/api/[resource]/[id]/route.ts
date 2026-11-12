import type { NextRequest } from "next/server";
import { fail, ok, withGuards } from "@/lib/api-helpers";
import {
  deleteAppointment,
  deleteAssignment,
  deleteClinical,
  deleteDoseLog,
  deleteNotification,
  deleteProfile,
  isClinicalResource,
  markNotification,
  updateAppointment,
  updateAssignment,
  updateClinical,
  updateProfile,
} from "@/lib/mutations";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ resource: string; id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { resource, id } = await ctx.params;
  return withGuards(async (user, body) => {
    switch (resource) {
      case "profile":
      case "clients":
      case "doctors":
      case "staff":
        return ok(await updateProfile(user, id, body));
      case "assignments":
        return ok(await updateAssignment(user, id, body));
      case "appointments":
        return ok(await updateAppointment(user, id, body));
      case "notifications":
        return ok(await markNotification(user, id, body));
      default:
        if (isClinicalResource(resource)) return ok(await updateClinical(user, resource, id, body));
        return fail("Unknown resource", 404);
    }
  }, req, { id });
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const { resource, id } = await ctx.params;
  return withGuards(async (user) => {
    switch (resource) {
      case "clients":
      case "doctors":
      case "staff":
        return ok(await deleteProfile(user, id));
      case "assignments":
        return ok(await deleteAssignment(user, id));
      case "appointments":
        return ok(await deleteAppointment(user, id));
      case "dose-logs":
        return ok(await deleteDoseLog(user, id));
      case "notifications":
        return ok(await deleteNotification(user, id));
      default:
        if (isClinicalResource(resource)) return ok(await deleteClinical(user, resource, id));
        return fail("Unknown resource", 404);
    }
  }, req, { id });
}
