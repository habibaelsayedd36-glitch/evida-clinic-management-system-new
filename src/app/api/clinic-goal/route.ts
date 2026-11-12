import type { NextRequest } from "next/server";
import { pool } from "@/db";
import { fail, ok, withGuards } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS clinic_settings (
      setting_key text PRIMARY KEY,
      numeric_value integer NOT NULL DEFAULT 0,
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);
}

export async function GET(req: NextRequest) {
  return withGuards(async (user) => {
    if (user.role !== "admin") return fail("Admin access required", 403);
    await ensureTable();
    const result = await pool.query(
      "SELECT numeric_value AS goal FROM clinic_settings WHERE setting_key = 'monthly_revenue_goal'"
    );
    return ok({ goal: Number(result.rows[0]?.goal ?? 0) });
  }, req, {});
}

export async function POST(req: NextRequest) {
  return withGuards(async (user, body) => {
    if (user.role !== "admin") return fail("Admin access required", 403);
    const goal = Number(body.goal);
    if (!Number.isSafeInteger(goal) || goal <= 0) return fail("Enter a valid monthly target greater than zero", 400);
    await ensureTable();
    await pool.query(
      `INSERT INTO clinic_settings (setting_key, numeric_value, updated_at)
       VALUES ('monthly_revenue_goal', $1, now())
       ON CONFLICT (setting_key) DO UPDATE SET numeric_value = EXCLUDED.numeric_value, updated_at = now()`,
      [goal],
    );
    return ok({ goal });
  }, req, {});
}
