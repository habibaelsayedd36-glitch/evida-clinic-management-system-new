import type { NextRequest } from "next/server";
import { AccessError } from "./acl";
import { AuthError, requireProfile } from "./auth";
import type { ProfileDTO } from "./types";

export async function readBody(req: NextRequest): Promise<Record<string, unknown>> {
  try {
    const data = await req.json();
    return (data ?? {}) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function ok(data: unknown, status = 200) {
  return Response.json(data, { status });
}

export function fail(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

export async function withGuards(
  handler: (user: ProfileDTO, body: Record<string, unknown>, ctx: { id?: string }) => Promise<Response>,
  req: NextRequest,
  ctx: { id?: string },
): Promise<Response> {
  try {
    const user = await requireProfile();
    const body = req.method === "GET" || req.method === "DELETE" ? await readBodySafe(req) : await readBody(req);
    return await handler(user, body, ctx);
  } catch (error) {
    if (error instanceof AccessError || error instanceof AuthError) {
      return fail(error.message, error.status);
    }
    const message = error instanceof Error ? error.message : "Unexpected error";
    console.error("[api]", message);
    return fail(message, 500);
  }
}

async function readBodySafe(req: NextRequest) {
  try {
    const text = await req.text();
    return text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

export function str(value: unknown, { required = false, label = "Value", max = 2000 } = {}): string | null {
  if (value === undefined || value === null) {
    if (required) throw new AccessError(`${label} is required`, 400);
    return null;
  }
  const text = String(value).trim();
  if (!text) {
    if (required) throw new AccessError(`${label} is required`, 400);
    return null;
  }
  if (text.length > max) throw new AccessError(`${label} is too long`, 400);
  return text;
}

export function num(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function int(value: unknown): number | null {
  const parsed = num(value);
  return parsed === null ? null : Math.round(parsed);
}

export function bool(value: unknown): boolean | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "boolean") return value;
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

export function dateOnly(value: unknown): string | null {
  const text = str(value);
  if (!text) return null;
  const match = /^\d{4}-\d{2}-\d{2}/.exec(text);
  if (!match) throw new AccessError("Invalid date format (expected YYYY-MM-DD)", 400);
  return match[0];
}

export function timestamp(value: unknown, label = "Appointment time"): Date {
  const text = str(value, { required: true, label });
  const parsed = new Date(text as string);
  if (Number.isNaN(parsed.getTime())) throw new AccessError(`Invalid ${label}`, 400);
  return parsed;
}

export function pickDefined<T extends Record<string, unknown>>(source: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(source)) {
    if (value !== undefined) out[key] = value;
  }
  return out as Partial<T>;
}
