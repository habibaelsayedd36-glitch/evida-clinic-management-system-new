import type { NextRequest } from "next/server";
import { loadScopedData } from "@/lib/queries";
import { fail, ok, withGuards } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

/** Single scoped read endpoint: everything the current role is allowed to see. */
export async function GET(req: NextRequest) {
  return withGuards(async (user) => {
    try {
      const data = await loadScopedData(user);
      return ok(data);
    } catch (error) {
      console.error("[bootstrap]", error);
      return fail("Could not load data - please try again", 500);
    }
  }, req, {});
}
