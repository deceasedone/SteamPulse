import { NextRequest, NextResponse } from 'next/server';
import { CACHE_TTL_SECONDS } from '@/lib/config';
import { rateLimitResponse } from '@/lib/rate-limit';

/**
 * Shared wrapper for the public read-only endpoints: rate limiting, a real 5xx
 * on query failure, and cache headers.
 */
export async function handleRoute<T>(
  req: NextRequest,
  fn: () => Promise<T>,
  label: string,
): Promise<NextResponse> {
  const limited = rateLimitResponse(req);
  if (limited) return limited;

  try {
    const data = await fn();
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': `public, s-maxage=${CACHE_TTL_SECONDS}, stale-while-revalidate=${CACHE_TTL_SECONDS * 2}`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[api/${label}]`, message);
    return NextResponse.json(
      { error: `Failed to fetch ${label} data` },
      { status: 503 },
    );
  }
}

export function intParam(req: NextRequest, name: string, fallback: number): number {
  const raw = req.nextUrl.searchParams.get(name);
  if (raw === null) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function floatParam(req: NextRequest, name: string, fallback: number): number {
  const raw = req.nextUrl.searchParams.get(name);
  if (raw === null) return fallback;
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function strParam(req: NextRequest, name: string): string {
  return (req.nextUrl.searchParams.get(name) ?? '').slice(0, 200).trim();
}
