import { TABLES } from './config';
import { runQuery, runQuerySingle, type QueryParams } from './bigquery';
import type {
  DashboardStats,
  GamesPerYear,
  GenreCount,
  GenreStats,
  Game,
  HypeScore,
  PublisherStats,
} from './types';

// Every warehouse read, shared by Server Components and the API routes.

// --------------------------------------------------------------------------
// Dashboard
// --------------------------------------------------------------------------
export async function getDashboardStats() {
  const statsQuery = `
    SELECT
      COUNT(*) AS total_games,
      ROUND(AVG(price), 2) AS avg_price,
      ROUND(AVG(metacritic), 1) AS avg_metacritic,
      APPROX_QUANTILES(price, 2)[OFFSET(1)] AS median_price,
      COUNTIF(is_free = TRUE) AS free_games,
      COUNTIF(is_free = FALSE) AS paid_games,
      COALESCE(SUM(total_reviews), 0) AS total_reviews,
      ROUND(SAFE_DIVIDE(COUNTIF(is_free = TRUE), COUNT(*)) * 100, 1) AS free_percentage
    FROM ${TABLES.stgGames}
  `;

  const trendQuery = `
    SELECT
      EXTRACT(YEAR FROM release_date) AS year,
      COUNT(*) AS game_count,
      ROUND(AVG(price), 2) AS avg_price,
      ROUND(AVG(metacritic), 1) AS avg_rating
    FROM ${TABLES.stgGames}
    WHERE release_date BETWEEN '2010-01-01' AND CURRENT_DATE()
    GROUP BY year
    ORDER BY year
  `;

  const genreQuery = `
    SELECT primary_genre AS genre, COUNT(*) AS game_count
    FROM ${TABLES.stgGames}
    WHERE primary_genre IS NOT NULL
    GROUP BY primary_genre
    ORDER BY game_count DESC
    LIMIT 8
  `;

  const [stats, yearlyTrend, topGenres] = await Promise.all([
    runQuerySingle<DashboardStats>(statsQuery),
    runQuery<GamesPerYear>(trendQuery),
    runQuery<GenreCount>(genreQuery),
  ]);

  if (!stats) {
    throw new Error('stg_games returned no aggregate row');
  }

  return { stats, yearlyTrend, topGenres, lastUpdated: new Date().toISOString() };
}

// --------------------------------------------------------------------------
// Explore
// --------------------------------------------------------------------------
export type GameFilterInput = {
  search?: string;
  genre?: string;
  maxPrice?: number;
  minRating?: number;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
};

/** Whitelist: user input never reaches an ORDER BY clause directly. */
const SORTABLE = {
  name: 'name',
  price: 'price',
  metacritic: 'metacritic',
  total_reviews: 'total_reviews',
  release_date: 'release_date',
  publisher: 'publisher',
} as const;

export type SortableColumn = keyof typeof SORTABLE;

// Object.hasOwn, not `in`: `in` would let '__proto__' pass the whitelist.
export const isSortable = (v: string): v is SortableColumn =>
  Object.hasOwn(SORTABLE, v);

export async function getGames(input: GameFilterInput) {
  const page = Math.max(1, input.page ?? 1);
  const limit = Math.min(100, Math.max(1, input.limit ?? 50));
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const params: QueryParams = { limit, offset };

  if (input.search) {
    conditions.push('LOWER(name) LIKE @search');
    params.search = `%${input.search.toLowerCase()}%`;
  }
  if (input.genre) {
    conditions.push('primary_genre = @genre');
    params.genre = input.genre;
  }
  if (typeof input.maxPrice === 'number' && input.maxPrice < 10000) {
    conditions.push('(is_free = TRUE OR COALESCE(price, 0) <= @maxPrice)');
    params.maxPrice = input.maxPrice;
  }
  if (typeof input.minRating === 'number' && input.minRating > 0) {
    conditions.push('metacritic >= @minRating');
    params.minRating = input.minRating;
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const sortCol = input.sortBy && isSortable(input.sortBy)
    ? SORTABLE[input.sortBy]
    : SORTABLE.total_reviews;
  const sortDir = input.sortDir === 'asc' ? 'ASC' : 'DESC';

  const rowsQuery = `
    SELECT
      appid, name,
      COALESCE(price, 0) AS price,
      is_free, metacritic, genres, primary_genre, header_image,
      COALESCE(total_reviews, 0) AS total_reviews,
      COALESCE(publisher, 'Unknown') AS publisher,
      CAST(release_date AS STRING) AS release_date
    FROM ${TABLES.stgGames}
    ${where}
    ORDER BY ${sortCol} ${sortDir} NULLS LAST, appid
    LIMIT @limit OFFSET @offset
  `;

  // Summary of the filtered set, for the Explore KPI cards.
  const summaryQuery = `
    SELECT
      COUNT(*) AS filtered_count,
      ROUND(AVG(price), 2) AS avg_price,
      ROUND(AVG(metacritic), 1) AS avg_rating,
      ROUND(SAFE_DIVIDE(COUNTIF(is_free = TRUE), COUNT(*)) * 100, 1) AS free_percentage
    FROM ${TABLES.stgGames}
    ${where}
  `;

  const [rows, summary] = await Promise.all([
    runQuery<Game>(rowsQuery, params),
    runQuerySingle<{
      filtered_count: number;
      avg_price: number | null;
      avg_rating: number | null;
      free_percentage: number | null;
    }>(summaryQuery, params),
  ]);

  const total = summary?.filtered_count ?? 0;

  return {
    data: rows,
    stats: {
      filtered_count: total,
      avg_price: summary?.avg_price ?? 0,
      avg_rating: summary?.avg_rating ?? null,
      free_percentage: summary?.free_percentage ?? 0,
    },
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

// --------------------------------------------------------------------------
// Genres / trends
// --------------------------------------------------------------------------
export async function getGenres() {
  return runQuery<{ genre: string }>(`
    SELECT DISTINCT primary_genre AS genre
    FROM ${TABLES.stgGames}
    WHERE primary_genre IS NOT NULL
    ORDER BY primary_genre
  `);
}

export async function getTrends() {
  // SELECT * tolerates both the old four-column mart and the current one.
  return runQuery<GenreStats>(`
    SELECT * FROM ${TABLES.martTrends}
    ORDER BY total_games DESC
    LIMIT 20
  `);
}

export async function getReleasesPerYear() {
  return runQuery<{ year: number; count: number }>(`
    SELECT EXTRACT(YEAR FROM release_date) AS year, COUNT(*) AS count
    FROM ${TABLES.stgGames}
    WHERE release_date BETWEEN '2010-01-01' AND CURRENT_DATE()
    GROUP BY year
    ORDER BY year
  `);
}

// --------------------------------------------------------------------------
// Hype
// --------------------------------------------------------------------------
/** Reviews per day since launch, over a caller-supplied window. */
export async function getHype(days: number, limit = 40) {
  const safeDays = Math.min(3650, Math.max(7, Math.round(days)));
  const safeLimit = Math.min(100, Math.max(1, Math.round(limit)));

  return runQuery<HypeScore>(
    `
    SELECT
      name, appid, primary_genre, total_reviews, metacritic, header_image,
      CAST(release_date AS STRING) AS release_date,
      DATE_DIFF(CURRENT_DATE(), release_date, DAY) AS days_since_release,
      ROUND(
        SAFE_DIVIDE(
          total_reviews,
          GREATEST(DATE_DIFF(CURRENT_DATE(), release_date, DAY), 1)
        ), 2
      ) AS hype_score
    FROM ${TABLES.stgGames}
    WHERE release_date IS NOT NULL
      AND release_date <= CURRENT_DATE()
      AND release_date >= DATE_SUB(CURRENT_DATE(), INTERVAL @days DAY)
      AND total_reviews > 0
    ORDER BY hype_score DESC
    LIMIT @limit
    `,
    { days: safeDays, limit: safeLimit },
  );
}

// --------------------------------------------------------------------------
// Publishers
// --------------------------------------------------------------------------
/**
 * Publisher leaderboard. Falls back to aggregating stg_games so the page works
 * before transform.py has built mart_publishers.
 */
export async function getPublishers(limit = 50) {
  const safeLimit = Math.min(200, Math.max(1, Math.round(limit)));

  const fromMart = `
    SELECT
      publisher, total_games, avg_rating, rating_stddev,
      high_quality_games, rated_games, total_reviews, avg_price
    FROM ${TABLES.martPublishers}
    ORDER BY total_games DESC
    LIMIT @limit
  `;

  const fromStaging = `
    SELECT
      publisher,
      COUNT(*) AS total_games,
      ROUND(AVG(metacritic), 1) AS avg_rating,
      ROUND(STDDEV_SAMP(metacritic), 2) AS rating_stddev,
      COUNTIF(metacritic >= 75) AS high_quality_games,
      COUNTIF(metacritic IS NOT NULL) AS rated_games,
      SUM(total_reviews) AS total_reviews,
      ROUND(AVG(price), 2) AS avg_price
    FROM ${TABLES.stgGames}
    WHERE publisher IS NOT NULL AND publisher != ''
    GROUP BY publisher
    ORDER BY total_games DESC
    LIMIT @limit
  `;

  try {
    return await runQuery<PublisherStats>(fromMart, { limit: safeLimit });
  } catch {
    console.warn('[queries] mart_publishers unavailable, aggregating stg_games');
    return runQuery<PublisherStats>(fromStaging, { limit: safeLimit });
  }
}

// --------------------------------------------------------------------------
// Freshness
// --------------------------------------------------------------------------
/**
 * How current the catalogue is. Velocity is measured against a window ending
 * today, so a stale lake makes short windows empty — say so rather than
 * rendering a blank page.
 */
export async function getCatalogueFreshness() {
  const row = await runQuerySingle<{
    newest_release: string | null;
    staleness_days: number | null;
  }>(`
    SELECT
      CAST(MAX(release_date) AS STRING) AS newest_release,
      DATE_DIFF(CURRENT_DATE(), MAX(release_date), DAY) AS staleness_days
    FROM ${TABLES.stgGames}
  `);

  return {
    newestRelease: row?.newest_release ?? null,
    stalenessDays: row?.staleness_days ?? null,
  };
}
