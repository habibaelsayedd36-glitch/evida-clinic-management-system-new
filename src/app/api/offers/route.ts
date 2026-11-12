import type { NextRequest } from "next/server";
import { pool } from "@/db";
import { fail, ok, withGuards } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

function clean(body: Record<string, unknown>) {
  const title = String(body.title ?? "").trim();
  if (!title) throw new Error("Service or offer title is required");
  const price = body.price === "" || body.price == null ? null : Number(body.price);
  const originalPrice = body.originalPrice === "" || body.originalPrice == null ? null : Number(body.originalPrice);
  if (price !== null && (!Number.isInteger(price) || price < 0)) throw new Error("Enter a valid promotional price");
  if (originalPrice !== null && (!Number.isInteger(originalPrice) || originalPrice < 0)) throw new Error("Enter a valid original price");
  const validUntil = body.validUntil ? String(body.validUntil) : null;
  if (validUntil && !/^\d{4}-\d{2}-\d{2}$/.test(validUntil)) throw new Error("Enter a valid offer deadline");
  return {
    title,
    category: String(body.category ?? "service"),
    description: String(body.description ?? ""),
    protocolDetails: String(body.protocolDetails ?? ""),
    price,
    originalPrice,
    packageSize: String(body.packageSize ?? ""),
    validUntil,
    active: body.active !== false,
  };
}

export async function GET(req: NextRequest) {
  return withGuards(async (user) => {
    if (user.role !== "admin") return fail("Admin access required", 403);
    const result = await pool.query('SELECT id, title, category, description, protocol_details AS "protocolDetails", price, original_price AS "originalPrice", package_size AS "packageSize", valid_until AS "validUntil", active, created_at AS "createdAt" FROM clinic_offers ORDER BY created_at DESC');
    return ok(result.rows);
  }, req, {});
}

export async function POST(req: NextRequest) {
  return withGuards(async (user, body) => {
    if (user.role !== "admin") return fail("Admin access required", 403);
    try {
      const v = clean(body);
      const result = await pool.query(
        'INSERT INTO clinic_offers (title, category, description, protocol_details, price, original_price, package_size, valid_until, active) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id',
        [v.title,v.category,v.description,v.protocolDetails,v.price,v.originalPrice,v.packageSize,v.validUntil,v.active],
      );
      return ok({ id: result.rows[0].id }, 201);
    } catch (e) { return fail(e instanceof Error ? e.message : "Could not save offer", 400); }
  }, req, {});
}
