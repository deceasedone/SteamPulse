import { runQuery } from '@/lib/bigquery';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const query = `
      SELECT 
        publisher,
        COUNT(*) as total_games,
        ROUND(AVG(metacritic), 1) as avg_rating,
        SUM(total_reviews) as total_reviews,
        ROUND(AVG(price), 2) as avg_price
      FROM \`steampulse-data-eng.dbt_gsinha.stg_games\`
      WHERE publisher IS NOT NULL 
        AND publisher != ''
      GROUP BY publisher
      ORDER BY total_games DESC
      LIMIT 50
    `;

    const rows = await runQuery(query);
    return NextResponse.json({ publishers: rows });
  } catch (error) {
    console.error('Publishers API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}