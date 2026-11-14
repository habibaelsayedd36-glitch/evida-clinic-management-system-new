import type { NextRequest } from "next/server";
import { pool } from "@/db";
import { assertClientAccess, visibleClientIds } from "@/lib/acl";
import { fail, ok, str, withGuards } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

async function ensureTable() {
  await pool.query(
    "CREATE TABLE IF NOT EXISTS clinic_patient_events (" +
    "id bigserial PRIMARY KEY, client_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE, " +
    "created_by uuid REFERENCES profiles(id) ON DELETE SET NULL, kind text NOT NULL, " +
    "payload jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now()); " +
    "CREATE INDEX IF NOT EXISTS clinic_patient_events_client_idx ON clinic_patient_events(client_id, created_at DESC); " +
    "CREATE INDEX IF NOT EXISTS clinic_patient_events_kind_idx ON clinic_patient_events(kind, created_at DESC);"
  );
}

const ALLOWED_KINDS = new Set(["body_measurement", "meal", "aftercare", "challenge", "feedback"]);

export async function GET(req: NextRequest) {
  return withGuards(async (user) => {
    await ensureTable();
    const allowed = await visibleClientIds(user);
    if (allowed && allowed.length === 0) return ok({ events: [] });
    const result = allowed === null
      ? await pool.query(
          'SELECT e.id, e.client_id AS "clientId", p.full_name AS "clientName", e.kind, e.payload, e.created_at AS "createdAt" FROM clinic_patient_events e JOIN profiles p ON p.id=e.client_id ORDER BY e.created_at DESC LIMIT 500'
        )
      : await pool.query(
          'SELECT e.id, e.client_id AS "clientId", p.full_name AS "clientName", e.kind, e.payload, e.created_at AS "createdAt" FROM clinic_patient_events e JOIN profiles p ON p.id=e.client_id WHERE e.client_id = ANY($1::uuid[]) ORDER BY e.created_at DESC LIMIT 500',
          [allowed]
        );
    return ok({ events: result.rows });
  }, req, {});
}

export async function POST(req: NextRequest) {
  return withGuards(async (user, body) => {
    const kind = str(body.kind, { required: true, label: "Event type", max: 40 });
    if (!kind || !ALLOWED_KINDS.has(kind)) return fail("Unsupported patient journey event", 400);
    const clientId = user.role === "client" ? user.id : str(body.clientId, { required: true, label: "Client", max: 64 });
    if (!clientId) return fail("Client is required", 400);
    await assertClientAccess(user, clientId);
    const payload = body.payload && typeof body.payload === "object" && !Array.isArray(body.payload)
      ? body.payload as Record<string, unknown>
      : {};
    const serialized = JSON.stringify(payload);
    if (serialized.length > 1400000) return fail("The attached content is too large. Please use a smaller image.", 413);

    if (kind === "body_measurement") {
      const weight = Number(payload.weightKg);
      if (!Number.isFinite(weight) || weight < 20 || weight > 400) return fail("Enter a valid weight between 20 and 400 kg.", 400);
      for (const [key, min, max] of [["waistCm", 20, 250], ["hipsCm", 20, 250], ["bodyFatPercent", 1, 75]] as const) {
        if (payload[key] !== null && payload[key] !== undefined && payload[key] !== "") {
          const value = Number(payload[key]);
          if (!Number.isFinite(value) || value < min || value > max) return fail("A body measurement is outside the accepted range.", 400);
        }
      }
    }
    if (kind === "meal") {
      const name = str(payload.name, { required: true, label: "Meal name", max: 160 });
      const value = Number(payload.calories);
      if (!name || !Number.isFinite(value) || value < 0 || value > 5000) return fail("Enter a meal name and valid calorie amount.", 400);
      if (typeof payload.photoDataUrl === "string" && !/^data:image\/(png|jpeg|webp);base64,/.test(payload.photoDataUrl)) return fail("Unsupported meal photo format.", 400);
    }
    if (kind === "aftercare") {
      const score = Number(payload.symptomScore);
      if (!Number.isInteger(score) || score < 0 || score > 10) return fail("Invalid symptom score.", 400);
    }
    if (kind === "challenge") {
      const challengeId = str(payload.challengeId, { required: true, label: "Challenge", max: 80 });
      const duplicate = await pool.query(
        "SELECT id FROM clinic_patient_events WHERE client_id=$1 AND kind='challenge' AND payload->>'challengeId'=$2 AND created_at>=date_trunc('day',now()) LIMIT 1",
        [clientId, challengeId]
      );
      if (duplicate.rowCount) return fail("This challenge is already marked complete today.", 409);
    }
    if (kind === "feedback") {
      const score = Number(payload.rating);
      const message = str(payload.message, { required: true, label: "Feedback", max: 3000 });
      if (!Number.isInteger(score) || score < 1 || score > 5 || !message) return fail("Enter a rating and feedback message.", 400);
    }

    const result = await pool.query(
      'INSERT INTO clinic_patient_events (client_id,created_by,kind,payload) VALUES ($1,$2,$3,$4::jsonb) RETURNING id, client_id AS "clientId", kind, payload, created_at AS "createdAt"',
      [clientId, user.id, kind, serialized]
    );

    if (kind === "aftercare" && Number(payload.symptomScore) >= 7) {
      const assigned = await pool.query("SELECT doctor_id FROM client_doctors WHERE client_id = $1", [clientId]);
      const admins = await pool.query("SELECT id FROM profiles WHERE role = 'admin' AND is_active = true");
      const recipients = Array.from(new Set([
        ...assigned.rows.map((row: { doctor_id: string }) => row.doctor_id),
        ...admins.rows.map((row: { id: string }) => row.id),
      ]));
      for (const recipient of recipients) {
        await pool.query(
          "INSERT INTO notifications (user_id,actor_id,client_id,title,body,kind,link) VALUES ($1,$2,$3,$4,$5,$6,$7)",
          [recipient, user.id, clientId, "Aftercare check-in needs review", "A patient reported a symptom score of " + payload.symptomScore + "/10 after " + String(payload.service || "a treatment") + ". Please review the patient report.", "aftercare", "/admin/journey"]
        );
      }
    }
    return ok({ event: result.rows[0] }, 201);
  }, req, {});
}
