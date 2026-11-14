import type { NextRequest } from "next/server";
import { pool } from "@/db";
import { fail, ok, str, withGuards } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS clinic_waitlist (
      id bigserial PRIMARY KEY,
      full_name text NOT NULL,
      phone text,
      service text,
      notes text,
      status text NOT NULL DEFAULT 'waiting',
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return withGuards(async (user, body) => {
    if (user.role !== "admin") return fail("Admin access required", 403);
    if (!/^\d+$/.test(id)) return fail("Invalid waitlist entry", 400);
    const status = str(body.status, { required: true, label: "Status", max: 20 });
    if (!["waiting", "contacted", "booked", "closed"].includes(status ?? "")) return fail("Invalid status", 400);
    await ensureTable();
    const result = await pool.query(
      `UPDATE clinic_waitlist SET status = $1, updated_at = now() WHERE id = $2
       RETURNING id, full_name AS "fullName", phone, service, notes, status, created_at AS "createdAt"`,
      [status, Number(id)]
    );
    if (!result.rowCount) return fail("Waitlist entry not found", 404);
    return ok({ entry: result.rows[0] });
  }, req, { id });
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return withGuards(async (user) => {
    if (user.role !== "admin") return fail("Admin access required", 403);
    if (!/^\d+$/.test(id)) return fail("Invalid waitlist entry", 400);
    await ensureTable();
    await pool.query("DELETE FROM clinic_waitlist WHERE id = $1", [Number(id)]);
    return ok({ deleted: true });
  }, req, { id });
}
