import type { NextRequest } from "next/server";
import { pool } from "@/db";
import { fail, ok, withGuards } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  return withGuards(async (user, body) => {
    if (user.role !== "admin") return fail("Admin access required", 403);
    try {
      const title = String(body.title ?? "").trim();
      if (!title) return fail("Service or offer title is required", 400);
      const price = body.price === "" || body.price == null ? null : Number(body.price);
      const originalPrice = body.originalPrice === "" || body.originalPrice == null ? null : Number(body.originalPrice);
      if ((price !== null && (!Number.isInteger(price) || price < 0)) || (originalPrice !== null && (!Number.isInteger(originalPrice) || originalPrice < 0))) return fail("Enter valid prices", 400);
      const validUntil = body.validUntil ? String(body.validUntil) : null;
      if (validUntil && !/^\d{4}-\d{2}-\d{2}$/.test(validUntil)) return fail("Enter a valid offer deadline", 400);
      const result = await pool.query(
        'UPDATE clinic_offers SET title=$1, category=$2, description=$3, protocol_details=$4, price=$5, original_price=$6, package_size=$7, valid_until=$8, active=$9, updated_at=now() WHERE id=$10 RETURNING id',
        [title,String(body.category ?? "service"),String(body.description ?? ""),String(body.protocolDetails ?? ""),price,originalPrice,String(body.packageSize ?? ""),validUntil,body.active !== false,id],
      );
      if (!result.rowCount) return fail("Offer not found", 404);
      return ok({ id });
    } catch { return fail("Could not update offer", 400); }
  }, req, { id });
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  return withGuards(async (user) => {
    if (user.role !== "admin") return fail("Admin access required", 403);
    await pool.query("DELETE FROM clinic_offers WHERE id=$1", [id]);
    return ok({ id });
  }, req, { id });
}
