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

export async function GET(req: NextRequest) {
  return withGuards(async (user) => {
    if (user.role !== "admin") return fail("Admin access required", 403);
    await ensureTable();
    const result = await pool.query(
      "SELECT id, full_name AS \"fullName\", phone, service, notes, status, created_at AS \"createdAt\" FROM clinic_waitlist ORDER BY created_at DESC LIMIT 250"
    );
    return ok({ entries: result.rows });
  }, req, {});
}

export async function POST(req: NextRequest) {
  return withGuards(async (user, body) => {
    if (user.role !== "admin") return fail("Admin access required", 403);
    const fullName = str(body.fullName, { required: true, label: "Client name", max: 120 });
    const phone = str(body.phone, { max: 40 });
    const service = str(body.service, { max: 120 });
    const notes = str(body.notes, { max: 1000 });
    await ensureTable();
    const result = await pool.query(
      `INSERT INTO clinic_waitlist (full_name, phone, service, notes)
       VALUES ($1, $2, $3, $4)
       RETURNING id, full_name AS "fullName", phone, service, notes, status, created_at AS "createdAt"`,
      [fullName, phone, service, notes]
    );
    return ok({ entry: result.rows[0] }, 201);
  }, req, {});
}
