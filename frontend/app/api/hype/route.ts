import { NextRequest } from 'next/server';
import { getHype } from '@/lib/queries';
import { handleRoute, intParam } from '../_shared';

export const revalidate = 3600;

export async function GET(req: NextRequest) {
  // Previously accepted `days` from the client and ignored it entirely.
  const days = intParam(req, 'days', 180);
  const limit = intParam(req, 'limit', 40);
  return handleRoute(req, async () => ({ all: await getHype(days, limit) }), 'hype');
}
