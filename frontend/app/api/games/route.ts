import { runQuery } from '@/lib/bigquery';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = 50;
    const offset = (page - 1) * limit;

    // Use safe parameterization
    const query = `
      SELECT 
        appid, 
        name, 
        price, 
        metacritic, 
        genres,
        primary_genre,
        header_image,
        total_reviews
      FROM \`steampulse-data-eng.dbt_gsinha.stg_games\`
      ORDER BY total_reviews DESC
      LIMIT @limit OFFSET @offset
    `;

    const rows = await runQuery(query, { limit, offset });
    return NextResponse.json({ data: rows });
  } catch (error) {
    console.error('Games API Error:', error);
    return NextResponse.json({ data: [] }, { status: 500 });
  }
}