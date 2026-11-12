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
    const count = await pool.query("SELECT COUNT(*)::int AS count FROM clinic_offers");
    if (count.rows[0].count === 0) {
      await pool.query(
        `INSERT INTO clinic_offers (title,category,description,protocol_details,price,original_price,package_size,valid_until,active) VALUES
        ($1,'service',$2,$3,500,1000,'Weekly meal plan + InBody assessment','2026-11-30',true),
        ($4,'protocol',$5,$6,1500,2000,'10 Units single option / 500 Units full package','2026-11-30',true),
        ($7,'protocol',$8,$9,2500,3000,'10 Units single option / 200 Units full package','2026-11-30',true),
        ($10,'protocol',$11,$12,3000,3500,'10 Units single option / 200 Units full package','2026-11-30',false)`,
        [
          "Normal Diet",
          "Clinical nutrition assessment, InBody body-composition scan and a personalized weekly meal plan with Dr. Mohab or Dr. Omnia.",
          "Includes full InBody body-composition and metabolic assessment plus a customized weekly meal plan in the app. Promotional price: 500 EGP (original 1,000 EGP). Offer deadline: 30/11/2026.",
          "UNCUT – Semaglutide",
          "GLP-1 receptor agonist protocol. Offered as a single package option or a full package, subject to individual medical assessment.",
          "Single option: 10 Units — 1,500 EGP (original 2,000 EGP). Full package: 500 Units — 20,000 EGP. Clinical assessment, eligibility, exact product concentration and prescribed dose must be confirmed by the treating physician. Package units must not be interpreted as a dose.",
          "PROCUT – Tirzepatide",
          "Dual GIP and GLP-1 receptor agonist protocol. Offered as a single package option or a full package, subject to individual medical assessment.",
          "Single option: 10 Units — 2,500 EGP (original 3,000 EGP). Full package: 200 Units — 30,000 EGP. Clinical assessment, eligibility, exact product concentration and prescribed dose must be confirmed by the treating physician. Package units must not be interpreted as a dose.",
          "PROCUT PREMIUM – Retatrutide",
          "Investigational triple-receptor medicine. Do not offer or administer as a routine clinic treatment unless its regulatory status and lawful availability have been verified by the clinic's medical director.",
          "Draft pricing supplied for internal review only: 10 Units — 3,000 EGP (original 3,500 EGP); full package 200 Units — 35,000 EGP. Retatrutide remains investigational; this entry is inactive and must not be presented as an available treatment. Medical director and regulatory review required."
        ]
      );
    }
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
