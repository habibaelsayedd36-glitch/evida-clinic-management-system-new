import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

// Never sign production sessions with a public or hard-coded fallback.
// In development, use a process-local random key when AUTH_SECRET is absent.
const DEVELOPMENT_SECRET = randomBytes(32).toString("base64url");

function getAuthSecret(): string {
  const configured = process.env.AUTH_SECRET;
  if (configured && configured.length >= 32) return configured;
  if (configured && configured.length < 32) {
    throw new Error("AUTH_SECRET must contain at least 32 characters");
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET is required in production");
  }
  return DEVELOPMENT_SECRET;
}

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;

export type TokenPayload = { uid: string; role: string; exp: number };

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password.normalize("NFKC"), salt, 64).toString("hex");
  return `scrypt$${salt}$${derived}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, salt, digest] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !digest) return false;
  const derived = scryptSync(password.normalize("NFKC"), salt, 64);
  const expected = Buffer.from(digest, "hex");
  if (expected.length !== derived.length) return false;
  return timingSafeEqual(derived, expected);
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

export function signToken(payload: Omit<TokenPayload, "exp">, ttl = TOKEN_TTL_SECONDS): string {
  const body = b64url(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + ttl }));
  const signature = createHmac("sha256", getAuthSecret()).update(body).digest("base64url");
  return `${body}.${signature}`;
}

export function verifyToken(token: string): TokenPayload | null {
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  const expected = createHmac("sha256", getAuthSecret()).update(body).digest();
  const provided = Buffer.from(signature, "base64url");
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as TokenPayload;
    if (typeof payload.uid !== "string" || !payload.uid || typeof payload.exp !== "number") return null;
    if (!Number.isFinite(payload.exp) || payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function randomId(): string {
  return randomBytes(12).toString("hex");
}
