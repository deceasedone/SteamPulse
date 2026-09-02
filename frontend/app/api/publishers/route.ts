import { NextRequest } from 'next/server';
import { getPublishers } from '@/lib/queries';
import { handleRoute, intParam } from '../_shared';

export const revalidate = 3600;

export async function GET(req: NextRequest) {
  const limit = intParam(req, 'limit', 50);
  return handleRoute(req, async () => ({ publishers: await getPublishers(limit) }), 'publishers');
}
