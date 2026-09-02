import { NextRequest } from 'next/server';
import { getGenres } from '@/lib/queries';
import { handleRoute } from '../_shared';

export const revalidate = 3600;

export async function GET(req: NextRequest) {
  return handleRoute(req, getGenres, 'genre');
}
