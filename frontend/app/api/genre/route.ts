import { runQuery } from '@/lib/bigquery';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // Cache for 1 hour

export async function GET() {
  try {
    const query = `
      SELECT DISTINCT primary_genre as genre
      FROM \`steampulse-data-eng.dbt_gsinha.stg_games\`
      WHERE primary_genre IS NOT NULL
      ORDER BY primary_genre
    `;

    const rows = await runQuery(query);
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Genres API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch genres' },
      { status: 500 }
    );
  }
}