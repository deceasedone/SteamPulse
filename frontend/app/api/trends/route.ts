import { runQuery } from '@/lib/bigquery';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // Cache for 1 hour

export async function GET() {
  try {
    const query = `
      SELECT * FROM \`steampulse-data-eng.dbt_gsinha.mart_trends\`
      ORDER BY total_games DESC
      LIMIT 20
    `;

    const rows = await runQuery(query);
    
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Trends API Error:', error);
    return NextResponse.json([], { status: 500 });
  }
}