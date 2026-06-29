import "server-only";
import crypto from "crypto";

// ─────────────────────────────────────────────────────────────
// Upload tokens (vendor-facing, no login).
//
// Token format:  {uuid}.{hmac}
// where hmac = HMAC-SHA256(uuid, UPLOAD_TOKEN_SECRET), base64url.
//
// The uuid is the unguessable bearer; the hmac lets us cheaply
// reject malformed/forged tokens before hitting the DB. Final
// authority is still the upload_requests row (existence, not
// completed, not expired).
// ─────────────────────────────────────────────────────────────

function secret(): string {
  const s = process.env.UPLOAD_TOKEN_SECRET;
  if (!s) throw new Error("UPLOAD_TOKEN_SECRET is not set");
  return s;
}

function sign(uuid: string): string {
  return crypto
    .createHmac("sha256", secret())
    .update(uuid)
    .digest("base64url");
}

export function generateUploadToken(): string {
  const uuid = crypto.randomUUID();
  return `${uuid}.${sign(uuid)}`;
}

/**
 * Verify the HMAC of a token without touching the DB. Returns true
 * only if the signature matches. Callers must still confirm the
 * upload_requests row is present, not completed, and not expired.
 */
export function verifyUploadTokenSignature(token: string): boolean {
  const [uuid, mac] = token.split(".");
  if (!uuid || !mac) return false;
  const expected = sign(uuid);
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
