/**
 * Best-effort, per-instance rate limiting. State lives in module scope, so it
 * persists across invocations on the same warm serverless instance but resets on
 * cold starts and isn't shared across concurrent instances/regions. That's a real
 * limitation, not a mistake — a proper fix (Upstash/Vercel KV-backed limiter) needs
 * provisioning a new resource, which wasn't done unilaterally. This is meant to stop
 * casual scripted abuse of a public endpoint backed by a real API key, not to be a
 * airtight distributed rate limiter.
 */
const buckets = new Map<string, number[]>();

export function isRateLimited(key: string, max: number, windowMs = 60_000): boolean {
  const now = Date.now();
  const timestamps = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  timestamps.push(now);
  buckets.set(key, timestamps);

  if (buckets.size > 5000) {
    for (const [k, v] of buckets) {
      if (v.every((t) => now - t >= windowMs)) buckets.delete(k);
    }
  }

  return timestamps.length > max;
}

export function clientKey(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip") ?? "unknown";
}
