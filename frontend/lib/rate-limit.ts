import { NextRequest, NextResponse } from 'next/server';
import { RATE_LIMIT } from './config';

/**
 * Fixed-window rate limiter for the public API routes, which all hit BigQuery.
 *
 * In-memory and per-instance: enough to stop casual hammering. The durable
 * backstops are `maximumBytesBilled` and a project-level GCP quota.
 */
type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
let lastSweep = Date.now();

function sweep(now: number) {
  // Amortised cleanup so the map cannot grow unbounded.
  if (now - lastSweep < RATE_LIMIT.windowMs) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

function clientKey(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.headers.get('x-real-ip') ?? 'unknown';
}

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  resetAt: number;
};

export function checkRateLimit(req: NextRequest): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const key = clientKey(req);
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    const bucket = { count: 1, resetAt: now + RATE_LIMIT.windowMs };
    buckets.set(key, bucket);
    return { ok: true, remaining: RATE_LIMIT.max - 1, resetAt: bucket.resetAt };
  }

  existing.count += 1;
  return {
    ok: existing.count <= RATE_LIMIT.max,
    remaining: Math.max(0, RATE_LIMIT.max - existing.count),
    resetAt: existing.resetAt,
  };
}

export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(RATE_LIMIT.max),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
  };
}

/** Returns a 429 response when the caller is over budget, else null. */
export function rateLimitResponse(req: NextRequest): NextResponse | null {
  const result = checkRateLimit(req);
  if (result.ok) return null;

  const retryAfter = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000));
  return NextResponse.json(
    { error: 'Too many requests' },
    {
      status: 429,
      headers: { ...rateLimitHeaders(result), 'Retry-After': String(retryAfter) },
    },
  );
}

/** Test seam. */
export function __resetRateLimiter() {
  buckets.clear();
  lastSweep = Date.now();
}
