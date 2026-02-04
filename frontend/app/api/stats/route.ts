import { runQuery } from '@/lib/bigquery';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const query = `
    SELECT 
      COUNT(*) as total_games,
      COUNTIF(is_free = true) as free_games,
      ROUND(AVG(metacritic), 1) as avg_metacritic
    FROM \`steampulse-data-eng.dbt_gsinha.stg_games\`
  `;
  const rows = await runQuery(query);
  return NextResponse.json(rows[0]);
}