import { createHmac, timingSafeEqual } from 'crypto';

// Time-boxed signed tokens for unauthenticated substitute access.
// No DB needed: payload + HMAC. Requires SUBSTITUTE_LINK_SECRET; if
// unset the feature is disabled (verify always fails, sign throws).

function b64url(s: Buffer | string) {
  return Buffer.from(s).toString('base64url');
}

export function signSubstituteToken(sessionId: string, ttlMinutes = 240): string {
  const secret = process.env.SUBSTITUTE_LINK_SECRET;
  if (!secret) throw new Error('SUBSTITUTE_LINK_SECRET not configured');
  const exp = Date.now() + ttlMinutes * 60_000;
  const payload = b64url(JSON.stringify({ s: sessionId, e: exp }));
  const sig = createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function verifySubstituteToken(token: string): string | null {
  const secret = process.env.SUBSTITUTE_LINK_SECRET;
  if (!secret) return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;

  const expected = createHmac('sha256', secret).update(payload).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const { s, e } = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (typeof s !== 'string' || typeof e !== 'number' || Date.now() > e) return null;
    return s;
  } catch {
    return null;
  }
}
