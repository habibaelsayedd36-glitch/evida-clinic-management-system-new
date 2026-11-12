import type { NextRequest } from "next/server";
import { pool } from "@/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Called every five minutes by the repository's scheduled workflow.
 * Creates in-app reminders only for confirmed appointments.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS appointment_reminders (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        appointment_id uuid NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
        reminder_type text NOT NULL CHECK (reminder_type IN ('24h', '2h')),
        sent_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (appointment_id, reminder_type)
      )
    `);

    const due = await client.query(`
      SELECT a.id, a.client_id, a.scheduled_at, a.kind,
             c.full_name AS client_name, d.full_name AS doctor_name
      FROM appointments a
      JOIN profiles c ON c.id = a.client_id
      JOIN profiles d ON d.id = a.doctor_id
      WHERE a.status = 'scheduled'
        AND (
          (a.scheduled_at > now() + interval '23 hours 50 minutes'
           AND a.scheduled_at <= now() + interval '24 hours')
          OR
          (a.scheduled_at > now() + interval '1 hour 50 minutes'
           AND a.scheduled_at <= now() + interval '2 hours')
        )
    `);

    let sent = 0;
    for (const appointment of due.rows) {
      const until = new Date(appointment.scheduled_at).getTime() - Date.now();
      const reminderType = until > 3 * 60 * 60 * 1000 ? "24h" : "2h";
      await client.query("BEGIN");
      try {
        const claimed = await client.query(
          `INSERT INTO appointment_reminders (appointment_id, reminder_type)
           VALUES ($1, $2) ON CONFLICT (appointment_id, reminder_type) DO NOTHING
           RETURNING id`,
          [appointment.id, reminderType],
        );
        if (claimed.rowCount) {
          const label = reminderType === "24h" ? "tomorrow" : "in 2 hours";
          const when = new Date(appointment.scheduled_at).toLocaleString("en-GB", {
            timeZone: "Africa/Cairo", dateStyle: "medium", timeStyle: "short",
          });
          await client.query(
            `INSERT INTO notifications (user_id, client_id, title, body, kind, link)
             VALUES ($1, $1, $2, $3, 'appointment', '/client')`,
            [
              appointment.client_id,
              reminderType === "24h" ? "Appointment reminder — tomorrow" : "Appointment reminder — in 2 hours",
              `Your confirmed session with ${appointment.doctor_name} is ${label} at ${when}. We look forward to seeing you at EVIDA Clinic.`,
            ],
          );
          sent += 1;
        }
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }

    return Response.json({ ok: true, checked: due.rowCount, sent });
  } catch (error) {
    console.error("[appointment-reminders]", error);
    return Response.json({ error: "Could not process appointment reminders" }, { status: 500 });
  } finally {
    client.release();
  }
}
