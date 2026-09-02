import { NextRequest } from 'next/server';
import { getGames } from '@/lib/queries';
import { floatParam, handleRoute, intParam, strParam } from '../_shared';

export const revalidate = 300;

export async function GET(req: NextRequest) {
  const input = {
    page: intParam(req, 'page', 1),
    limit: intParam(req, 'limit', 50),
    search: strParam(req, 'search'),
    genre: strParam(req, 'genre'),
    maxPrice: floatParam(req, 'maxPrice', 10000),
    minRating: intParam(req, 'minRating', 0),
    sortBy: strParam(req, 'sortBy'),
    sortDir: strParam(req, 'sortDir') === 'asc' ? ('asc' as const) : ('desc' as const),
  };
  return handleRoute(req, () => getGames(input), 'games');
}
