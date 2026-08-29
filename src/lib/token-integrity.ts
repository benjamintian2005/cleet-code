import { createHmac, timingSafeEqual } from "crypto";

const SECRET = process.env.SCORE_SIGNING_SECRET ?? "";

/**
 * Signs a running cumulative-token total so the client can carry it between
 * requests (ask -> ask -> grade -> grade -> ...) without a database, while
 * making it tamper-evident: only the server can produce a signature that
 * verifyTokenTotal() will accept, so a client can't just edit the number
 * to erase a token penalty from their score.
 */
export function signTokenTotal(value: number): string {
  const payload = String(Math.max(0, Math.floor(value)));
  const hmac = createHmac("sha256", SECRET).update(payload).digest("hex");
  return `${payload}.${hmac}`;
}

/** Returns the verified total, or 0 if the token is missing, malformed, or tampered with. */
export function verifyTokenTotal(signed: string | undefined | null): number {
  if (!signed) return 0;
  const [payload, hmac] = signed.split(".");
  if (!payload || !hmac) return 0;

  const expected = createHmac("sha256", SECRET).update(payload).digest("hex");
  const expectedBuf = Buffer.from(expected, "hex");
  const actualBuf = Buffer.from(hmac, "hex");
  if (expectedBuf.length !== actualBuf.length || !timingSafeEqual(expectedBuf, actualBuf)) {
    return 0;
  }

  const value = Number(payload);
  return Number.isFinite(value) && value >= 0 ? value : 0;
}
