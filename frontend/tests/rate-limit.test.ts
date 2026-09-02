import { beforeEach, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import {
  __resetRateLimiter,
  checkRateLimit,
  rateLimitResponse,
} from '@/lib/rate-limit';
import { RATE_LIMIT } from '@/lib/config';

const reqFrom = (ip: string) =>
  new NextRequest('https://example.test/api/games', {
    headers: { 'x-forwarded-for': ip },
  });

describe('rate limiter', () => {
  beforeEach(() => __resetRateLimiter());

  it('allows requests up to the configured ceiling', () => {
    for (let i = 0; i < RATE_LIMIT.max; i++) {
      expect(checkRateLimit(reqFrom('1.1.1.1')).ok).toBe(true);
    }
  });

  it('blocks once the ceiling is exceeded', () => {
    for (let i = 0; i < RATE_LIMIT.max; i++) checkRateLimit(reqFrom('2.2.2.2'));
    expect(checkRateLimit(reqFrom('2.2.2.2')).ok).toBe(false);
  });

  it('tracks each client address independently', () => {
    for (let i = 0; i < RATE_LIMIT.max; i++) checkRateLimit(reqFrom('3.3.3.3'));
    expect(checkRateLimit(reqFrom('3.3.3.3')).ok).toBe(false);
    expect(checkRateLimit(reqFrom('4.4.4.4')).ok).toBe(true);
  });

  it('uses only the first hop of x-forwarded-for', () => {
    const proxied = new NextRequest('https://example.test/api/games', {
      headers: { 'x-forwarded-for': '5.5.5.5, 10.0.0.1, 10.0.0.2' },
    });
    for (let i = 0; i < RATE_LIMIT.max; i++) checkRateLimit(proxied);
    expect(checkRateLimit(reqFrom('5.5.5.5')).ok).toBe(false);
  });

  it('reports a decreasing remaining budget', () => {
    const first = checkRateLimit(reqFrom('6.6.6.6'));
    const second = checkRateLimit(reqFrom('6.6.6.6'));
    expect(second.remaining).toBe(first.remaining - 1);
  });

  it('returns a 429 with Retry-After once over budget', async () => {
    for (let i = 0; i < RATE_LIMIT.max; i++) checkRateLimit(reqFrom('7.7.7.7'));
    const res = rateLimitResponse(reqFrom('7.7.7.7'));
    expect(res).not.toBeNull();
    expect(res!.status).toBe(429);
    expect(Number(res!.headers.get('Retry-After'))).toBeGreaterThan(0);
    expect(res!.headers.get('X-RateLimit-Limit')).toBe(String(RATE_LIMIT.max));
  });

  it('returns null while the caller is within budget', () => {
    expect(rateLimitResponse(reqFrom('8.8.8.8'))).toBeNull();
  });
});
