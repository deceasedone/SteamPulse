import { runQuery } from '@/lib/bigquery';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1');
  const search = searchParams.get('search') || '';
  const offset = (page - 1) * 20;

  const query = `
    SELECT appid, name, price, metacritic, genres, header_image
    FROM \`steampulse-data-eng.dbt_gsinha.stg_games\`
    WHERE LOWER(name) LIKE @name
    ORDER BY metacritic DESC NULLS LAST
    LIMIT 20 OFFSET @offset
  `;

  const rows = await runQuery(query, { 
    name: `%${search.toLowerCase()}%`, 
    offset, 
    limit: 20 
  });
  
  return NextResponse.json(rows);
}