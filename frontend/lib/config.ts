// Warehouse coordinates and cost guards, declared once.

export const PROJECT_ID =
  process.env.GCP_PROJECT_ID ?? 'steampulse-data-eng';

export const MART_DATASET = process.env.BQ_MART_DATASET ?? 'dbt_gsinha';

const fqn = (table: string) => `\`${PROJECT_ID}.${MART_DATASET}.${table}\``;

export const TABLES = {
  stgGames: fqn('stg_games'),
  martTrends: fqn('mart_trends'),
  martPublishers: fqn('mart_publishers'),
} as const;

// BigQuery cancels a query that would exceed this rather than billing it.
export const MAX_BYTES_BILLED = Number(
  process.env.BQ_MAX_BYTES_BILLED ?? 500_000_000, // 500 MB
);

/** Seconds to cache route responses. The warehouse rebuilds daily. */
export const CACHE_TTL_SECONDS = Number(
  process.env.CACHE_TTL_SECONDS ?? 3600,
);

/** Requests per IP per window for the public API routes. */
export const RATE_LIMIT = {
  max: Number(process.env.RATE_LIMIT_MAX ?? 60),
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000),
} as const;
