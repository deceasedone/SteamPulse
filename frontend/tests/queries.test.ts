import { describe, expect, it, vi, beforeEach } from 'vitest';

// The BigQuery client must never be constructed in tests.
const runQuery = vi.fn();
const runQuerySingle = vi.fn();

vi.mock('@/lib/bigquery', () => ({
  runQuery: (...args: unknown[]) => runQuery(...args),
  runQuerySingle: (...args: unknown[]) => runQuerySingle(...args),
  QueryError: class QueryError extends Error {},
}));

const { getGames, getHype, getPublishers, isSortable } = await import(
  '@/lib/queries'
);

const lastSql = () => String(runQuery.mock.calls.at(-1)?.[0] ?? '');
const lastParams = () =>
  (runQuery.mock.calls.at(-1)?.[1] ?? {}) as Record<string, unknown>;

beforeEach(() => {
  runQuery.mockReset().mockResolvedValue([]);
  runQuerySingle.mockReset().mockResolvedValue({
    filtered_count: 0,
    avg_price: null,
    avg_rating: null,
    free_percentage: null,
  });
});

describe('sort whitelist', () => {
  it('accepts known columns', () => {
    expect(isSortable('metacritic')).toBe(true);
    expect(isSortable('total_reviews')).toBe(true);
  });

  it('rejects anything else', () => {
    expect(isSortable('name; DROP TABLE x')).toBe(false);
    expect(isSortable('__proto__')).toBe(false);
  });
});

describe('getGames', () => {
  it('parameterises the search term rather than interpolating it', async () => {
    await getGames({ search: "'; DROP TABLE stg_games; --" });
    expect(lastSql()).toContain('LOWER(name) LIKE @search');
    expect(lastSql()).not.toContain('DROP TABLE');
    expect(lastParams().search).toContain('drop table');
  });

  it('falls back to a safe column when sortBy is not whitelisted', async () => {
    await getGames({ sortBy: 'appid); DELETE FROM x --' });
    expect(lastSql()).toContain('ORDER BY total_reviews DESC');
  });

  it('honours a whitelisted sort column and direction', async () => {
    await getGames({ sortBy: 'metacritic', sortDir: 'asc' });
    expect(lastSql()).toContain('ORDER BY metacritic ASC');
  });

  it('caps the page size so one request cannot scan the catalogue', async () => {
    await getGames({ limit: 100000 });
    expect(lastParams().limit).toBe(100);
  });

  it('clamps page numbers to at least 1', async () => {
    await getGames({ page: -5 });
    expect(lastParams().offset).toBe(0);
  });

  it('omits the price filter when the slider is at its maximum', async () => {
    await getGames({ maxPrice: 10000 });
    expect(lastSql()).not.toContain('@maxPrice');
  });

  it('applies the price filter below the maximum', async () => {
    await getGames({ maxPrice: 500 });
    expect(lastSql()).toContain('@maxPrice');
    expect(lastParams().maxPrice).toBe(500);
  });

  it('returns summary stats for the filtered set', async () => {
    runQuerySingle.mockResolvedValue({
      filtered_count: 42,
      avg_price: 199.5,
      avg_rating: 78,
      free_percentage: 12.5,
    });
    const result = await getGames({});
    // These cards were previously bound to a key the API never returned.
    expect(result.stats.filtered_count).toBe(42);
    expect(result.total).toBe(42);
    expect(result.totalPages).toBe(1);
  });
});

describe('getHype', () => {
  it('passes the caller-supplied window through as a parameter', async () => {
    await getHype(30);
    expect(lastParams().days).toBe(30);
    expect(lastSql()).toContain('INTERVAL @days DAY');
  });

  it('clamps absurd windows instead of trusting the query string', async () => {
    await getHype(999999);
    expect(lastParams().days).toBe(3650);
    await getHype(-1);
    expect(lastParams().days).toBe(7);
  });

  it('never divides by a zero-day age', async () => {
    await getHype(180);
    expect(lastSql()).toContain('GREATEST(DATE_DIFF(CURRENT_DATE(), release_date, DAY), 1)');
  });

  it('excludes unreleased titles', async () => {
    await getHype(180);
    expect(lastSql()).toContain('release_date <= CURRENT_DATE()');
  });
});

describe('getPublishers', () => {
  it('reads the mart when it is available', async () => {
    await getPublishers(10);
    expect(lastSql()).toContain('mart_publishers');
  });

  it('falls back to aggregating stg_games when the mart is missing', async () => {
    runQuery
      .mockRejectedValueOnce(new Error('Not found: Table mart_publishers'))
      .mockResolvedValueOnce([]);
    await getPublishers(10);
    expect(lastSql()).toContain('stg_games');
    expect(lastSql()).toContain('STDDEV_SAMP(metacritic)');
  });
});
