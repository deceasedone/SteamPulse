import { runQuery } from '@/lib/bigquery';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    const search = searchParams.get('search') || '';
    const genre = searchParams.get('genre') || '';
    const maxPrice = parseFloat(searchParams.get('maxPrice') || '10000');
    const minRating = parseInt(searchParams.get('minRating') || '0');

    const conditions: string[] = [];
    const params: Record<string, any> = { limit, offset };

    if (search) {
      conditions.push('LOWER(name) LIKE @search');
      params.search = `%${search.toLowerCase()}%`;
    }
    if (genre) {
      conditions.push('primary_genre = @genre');
      params.genre = genre;
    }
    if (maxPrice < 10000) {
      conditions.push('price <= @maxPrice');
      params.maxPrice = maxPrice;
    }
    if (minRating > 0) {
      conditions.push('metacritic >= @minRating');
      params.minRating = minRating;
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT 
        appid, name, 
        COALESCE(price, 0) AS price, 
        is_free, metacritic, genres, primary_genre,
        header_image, 
        COALESCE(total_reviews, 0) AS total_reviews, 
        COALESCE(publisher, 'Unknown') AS publisher,
        CAST(release_date AS STRING) AS release_date
      FROM \`steampulse-data-eng.dbt_gsinha.stg_games\`
      ${whereClause}
      ORDER BY total_reviews DESC
      LIMIT @limit OFFSET @offset
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM \`steampulse-data-eng.dbt_gsinha.stg_games\`
      ${whereClause}
    `;

    const [rows, countResult] = await Promise.all([
      runQuery(query, params),
      runQuery(countQuery, params),
    ]);

    const total = countResult[0]?.total || 0;

    return NextResponse.json({
      data: rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Games API Error:', error);
    return NextResponse.json({ data: [], error: 'Failed to fetch games' }, { status: 500 });
  }
}
