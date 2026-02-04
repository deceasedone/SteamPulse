import { runQuery } from '@/lib/bigquery';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const query = `
      SELECT 
        name,
        appid,
        primary_genre,
        total_reviews,
        release_date,
        price,
        -- Simple Hype Score: Reviews per day
        SAFE_DIVIDE(total_reviews, DATE_DIFF(CURRENT_DATE(), release_date, DAY)) as hype_score
      FROM \`steampulse-data-eng.dbt_gsinha.stg_games\`
      WHERE release_date >= '2023-01-01' -- Look at recent games
      ORDER BY hype_score DESC
      LIMIT 20
    `;

    const rows = await runQuery(query);
    return NextResponse.json({ all: rows });
  } catch (error) {
    console.error('Hype API Error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}