import { createHash } from "node:crypto";
import { pool } from "@/db";

const WINDOW_MINUTES = 15;
const MAX_ATTEMPTS = 8;

function bucket(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function buckets(email: string, ip: string | null): string[] {
  return [
    `email:${bucket(email.trim().toLowerCase())}`,
    ...(ip ? [`ip:${bucket(ip)}`] : []),
  ];
}

let tableReady = false;

async function ensureTable() {
  if (tableReady) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS auth_rate_limits (
      bucket text PRIMARY KEY,
      attempts integer NOT NULL DEFAULT 0,
      window_started_at timestamptz NOT NULL DEFAULT now(),
      blocked_until timestamptz
    )
  `);
  await pool.query(`
    DELETE FROM auth_rate_limits
    WHERE window_started_at < now() - interval '1 day'
      AND (blocked_until IS NULL OR blocked_until < now())
  `);
  tableReady = true;
}

export async function isLoginRateLimited(email: string, ip: string | null): Promise<boolean> {
  await ensureTable();
  const keys = buckets(email, ip);
  const result = await pool.query(
    `SELECT 1 FROM auth_rate_limits
     WHERE bucket = ANY($1::text[])
       AND (blocked_until > now()
         OR (window_started_at > now() - ($2 || ' minutes')::interval AND attempts >= $3))
     LIMIT 1`,
    [keys, WINDOW_MINUTES, MAX_ATTEMPTS],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function recordFailedLogin(email: string, ip: string | null): Promise<void> {
  await ensureTable();
  for (const key of buckets(email, ip)) {
    await pool.query(
      `INSERT INTO auth_rate_limits (bucket, attempts, window_started_at, blocked_until)
       VALUES ($1, 1, now(), NULL)
       ON CONFLICT (bucket) DO UPDATE SET
         attempts = CASE
           WHEN auth_rate_limits.window_started_at <= now() - interval '15 minutes' THEN 1
           ELSE auth_rate_limits.attempts + 1
         END,
         window_started_at = CASE
           WHEN auth_rate_limits.window_started_at <= now() - interval '15 minutes' THEN now()
           ELSE auth_rate_limits.window_started_at
         END,
         blocked_until = CASE
           WHEN auth_rate_limits.blocked_until > now() THEN auth_rate_limits.blocked_until
           WHEN auth_rate_limits.window_started_at <= now() - interval '15 minutes' THEN NULL
           WHEN auth_rate_limits.attempts + 1 >= 8 THEN now() + interval '15 minutes'
           ELSE NULL
         END`,
      [key],
    );
  }
}

export async function clearLoginFailures(email: string, ip: string | null): Promise<void> {
  await ensureTable();
  await pool.query("DELETE FROM auth_rate_limits WHERE bucket = ANY($1::text[])", [buckets(email, ip)]);
}
