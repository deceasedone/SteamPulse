import { runQuery } from '@/lib/bigquery';
import { NextResponse } from 'next/server';
import type { DashboardStats, GamesPerYear } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // Cache for 1 hour

export async function GET() {
  try {
    // Main KPIs query
    const statsQuery = `
      SELECT 
        COUNT(*) as total_games,
        ROUND(AVG(price), 2) as avg_price,
        ROUND(AVG(metacritic), 1) as avg_metacritic,
        APPROX_QUANTILES(price, 2)[OFFSET(1)] as median_price,
        COUNTIF(is_free = true) as free_games,
        COUNTIF(is_free = false) as paid_games,
        SUM(total_reviews) as total_reviews,
        ROUND(COUNTIF(is_free = true) / COUNT(*) * 100, 1) as free_percentage
      FROM \`steampulse-data-eng.dbt_gsinha.stg_games\`
    `;

    // Games per year trend
    const trendQuery = `
      SELECT 
        EXTRACT(YEAR FROM release_date) as year,
        COUNT(*) as game_count,
        ROUND(AVG(price), 2) as avg_price,
        ROUND(AVG(metacritic), 1) as avg_rating
      FROM \`steampulse-data-eng.dbt_gsinha.stg_games\`
      WHERE EXTRACT(YEAR FROM release_date) >= 2010
        AND EXTRACT(YEAR FROM release_date) <= EXTRACT(YEAR FROM CURRENT_DATE())
      GROUP BY year
      ORDER BY year
    `;

    // Top genres by count
    const genreQuery = `
      SELECT 
        primary_genre as genre,
        COUNT(*) as game_count
      FROM \`steampulse-data-eng.dbt_gsinha.stg_games\`
      WHERE primary_genre IS NOT NULL
      GROUP BY primary_genre
      ORDER BY game_count DESC
      LIMIT 8
    `;

    const [stats, yearlyTrend, topGenres] = await Promise.all([
      runQuery<DashboardStats>(statsQuery),
      runQuery<GamesPerYear>(trendQuery),
      runQuery<{ genre: string; game_count: number }>(genreQuery),
    ]);

    return NextResponse.json({
      stats: stats[0],
      yearlyTrend,
      topGenres,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Dashboard API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}