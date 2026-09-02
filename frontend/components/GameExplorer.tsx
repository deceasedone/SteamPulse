'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronsUpDown, RotateCcw, Search } from 'lucide-react';
import { KPICard } from '@/components/KPICard';
import { inr } from '@/components/charts/theme';
import type { ExploreStats, Game, PaginatedGames } from '@/lib/types';

const SORT_COLUMNS = [
  { key: 'name', label: 'Game', width: 'w-[36%]' },
  { key: 'price', label: 'Price', width: '' },
  { key: 'metacritic', label: 'Metacritic', width: '' },
  { key: 'total_reviews', label: 'Reviews', width: '' },
  { key: 'release_date', label: 'Released', width: '' },
  { key: 'publisher', label: 'Publisher', width: '' },
] as const;

type SortKey = (typeof SORT_COLUMNS)[number]['key'];

const PRICE_MAX = 5000;
const PAGE_SIZE = 50;

function formatDate(raw: string | null): string {
  if (!raw) return '—';
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
}

function ratingClass(score: number): string {
  if (score >= 75) return 'text-lime';
  if (score >= 50) return 'text-warn';
  return 'text-danger';
}

interface Props {
  initialResult: PaginatedGames;
  genres: string[];
}

export function GameExplorer({ initialResult, genres }: Props) {
  const [rows, setRows] = useState<Game[]>(initialResult.data);
  const [stats, setStats] = useState<ExploreStats>(initialResult.stats);
  const [totalPages, setTotalPages] = useState(initialResult.totalPages);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  // searchInput is per-keystroke; search is debounced and triggers the query.
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [genre, setGenre] = useState('');
  const [maxPrice, setMaxPrice] = useState(PRICE_MAX);
  const [minRating, setMinRating] = useState(0);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortKey>('total_reviews');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const isInitial = useRef(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    // The server already rendered the default view; skip the mount refetch.
    if (isInitial.current) {
      isInitial.current = false;
      return;
    }

    const controller = new AbortController();
    setLoading(true);

    const params = new URLSearchParams({
      page: String(page),
      limit: String(PAGE_SIZE),
      maxPrice: String(maxPrice),
      sortBy,
      sortDir,
      ...(search && { search }),
      ...(genre && { genre }),
      ...(minRating > 0 && { minRating: String(minRating) }),
    });

    (async () => {
      try {
        setError(undefined);
        const res = await fetch(`/api/games?${params}`, {
          signal: controller.signal,
        });
        if (!res.ok) {
          throw new Error(
            res.status === 429
              ? 'Too many requests — slow down a moment.'
              : `Request failed (${res.status})`,
          );
        }
        const json: PaginatedGames = await res.json();
        setRows(json.data ?? []);
        setStats(json.stats);
        setTotalPages(json.totalPages ?? 1);
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        setError((err as Error).message);
        setRows([]);
      } finally {
        setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [search, genre, maxPrice, minRating, page, sortBy, sortDir]);

  const toggleSort = useCallback(
    (key: SortKey) => {
      if (sortBy === key) {
        setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
      } else {
        setSortBy(key);
        setSortDir('desc');
      }
      setPage(1);
    },
    [sortBy],
  );

  const reset = () => {
    setSearchInput('');
    setSearch('');
    setGenre('');
    setMaxPrice(PRICE_MAX);
    setMinRating(0);
    setSortBy('total_reviews');
    setSortDir('desc');
    setPage(1);
  };

  const filtersActive = useMemo(
    () => Boolean(search || genre || maxPrice < PRICE_MAX || minRating > 0),
    [search, genre, maxPrice, minRating],
  );

  const inputClass =
    'w-full rounded-lg border border-edge bg-ground px-3 py-2 text-sm text-ink placeholder:text-ink-subtle focus:border-pulse focus:outline-none';

  return (
    <>
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KPICard label="Matching games" value={stats.filtered_count} accent="pulse" />
        <KPICard label="Average price" value={inr(stats.avg_price)} />
        <KPICard label="Average rating" value={stats.avg_rating} accent="lime" />
        <KPICard
          label="Free to play"
          value={stats.free_percentage === null ? '—' : `${stats.free_percentage}%`}
        />
      </div>

      {/* Filters */}
      <div className="panel mb-6 p-5">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <label
              htmlFor="game-search"
              className="mb-2 block text-sm font-medium text-ink-muted"
            >
              Search
            </label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle"
                aria-hidden="true"
              />
              <input
                id="game-search"
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Game name…"
                className={`${inputClass} pl-9`}
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="game-genre"
              className="mb-2 block text-sm font-medium text-ink-muted"
            >
              Genre
            </label>
            <select
              id="game-genre"
              value={genre}
              onChange={(e) => {
                setGenre(e.target.value);
                setPage(1);
              }}
              className={inputClass}
            >
              <option value="">All genres</option>
              {genres.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="game-price"
              className="mb-2 block text-sm font-medium text-ink-muted"
            >
              Max price:{' '}
              <span className="text-ink">
                {maxPrice >= PRICE_MAX ? 'Any' : inr(maxPrice)}
              </span>
            </label>
            <input
              id="game-price"
              type="range"
              min={0}
              max={PRICE_MAX}
              step={100}
              value={maxPrice}
              onChange={(e) => {
                setMaxPrice(Number(e.target.value));
                setPage(1);
              }}
              className="w-full accent-[#66c0f4]"
              aria-valuetext={maxPrice >= PRICE_MAX ? 'Any price' : `₹${maxPrice}`}
            />
          </div>

          <div>
            <label
              htmlFor="game-rating"
              className="mb-2 block text-sm font-medium text-ink-muted"
            >
              Min rating: <span className="text-ink">{minRating || 'Any'}</span>
            </label>
            <input
              id="game-rating"
              type="range"
              min={0}
              max={100}
              step={10}
              value={minRating}
              onChange={(e) => {
                setMinRating(Number(e.target.value));
                setPage(1);
              }}
              className="w-full accent-[#a3cf06]"
              aria-valuetext={minRating ? `${minRating} or higher` : 'Any rating'}
            />
          </div>
        </div>

        {filtersActive && (
          <button
            type="button"
            onClick={reset}
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-edge bg-surface-raised px-3 py-1.5 text-sm text-ink-muted transition-colors hover:border-edge-strong hover:text-ink"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Reset filters
          </button>
        )}
      </div>

      {/* Results */}
      <div className="panel overflow-hidden">
        {error ? (
          <div className="p-16 text-center" role="alert">
            <p className="mb-1 font-medium text-danger">Couldn&apos;t load games</p>
            <p className="text-sm text-ink-subtle">{error}</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px]">
                <caption className="sr-only">
                  Steam games matching the current filters, sortable by column
                </caption>
                <thead className="border-b border-edge bg-ground/60">
                  <tr>
                    {SORT_COLUMNS.map(({ key, label, width }) => {
                      const active = sortBy === key;
                      return (
                        <th
                          key={key}
                          scope="col"
                          aria-sort={
                            active
                              ? sortDir === 'asc'
                                ? 'ascending'
                                : 'descending'
                              : 'none'
                          }
                          className={`px-5 py-3.5 text-left ${width}`}
                        >
                          <button
                            type="button"
                            onClick={() => toggleSort(key)}
                            className={`inline-flex items-center gap-1.5 text-sm font-semibold transition-colors ${
                              active
                                ? 'text-pulse'
                                : 'text-ink-muted hover:text-ink'
                            }`}
                          >
                            {label}
                            {active ? (
                              sortDir === 'asc' ? (
                                <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                              ) : (
                                <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                              )
                            ) : (
                              <ChevronsUpDown
                                className="h-3.5 w-3.5 opacity-40"
                                aria-hidden="true"
                              />
                            )}
                          </button>
                        </th>
                      );
                    })}
                  </tr>
                </thead>

                <tbody className="divide-y divide-edge">
                  {loading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i}>
                        <td colSpan={SORT_COLUMNS.length} className="px-5 py-4">
                          <div className="skeleton h-10 w-full">
                            <div className="skeleton-shimmer" />
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : rows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={SORT_COLUMNS.length}
                        className="px-6 py-16 text-center"
                      >
                        <p className="mb-2 font-medium text-ink">
                          No games match {search ? `“${search}”` : 'these filters'}
                        </p>
                        <p className="mx-auto max-w-md text-sm text-ink-subtle">
                          SteamPulse tracks a curated snapshot of ~10,000 popular
                          titles, not the full Steam catalogue. Try{' '}
                          <a
                            href={`https://store.steampowered.com/search/?term=${encodeURIComponent(search)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-pulse hover:underline"
                          >
                            the Steam store
                          </a>{' '}
                          or{' '}
                          <a
                            href={`https://steamdb.info/search/?a=app&q=${encodeURIComponent(search)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-pulse hover:underline"
                          >
                            SteamDB
                          </a>
                          .
                        </p>
                      </td>
                    </tr>
                  ) : (
                    rows.map((game) => (
                      <tr
                        key={game.appid}
                        className="transition-colors hover:bg-surface-hover"
                      >
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            {game.header_image ? (
                              <Image
                                src={game.header_image}
                                alt=""
                                width={92}
                                height={43}
                                className="h-11 w-[5.75rem] shrink-0 rounded object-cover"
                                unoptimized
                              />
                            ) : (
                              <div className="h-11 w-[5.75rem] shrink-0 rounded bg-surface-raised" />
                            )}
                            <div className="min-w-0">
                              <a
                                href={`https://store.steampowered.com/app/${game.appid}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block truncate font-medium text-ink hover:text-pulse"
                              >
                                {game.name}
                              </a>
                              <p className="truncate text-xs text-ink-subtle">
                                {game.primary_genre ?? 'Uncategorised'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          {game.is_free ? (
                            <span className="rounded bg-lime/15 px-2 py-0.5 text-xs font-semibold text-lime">
                              FREE
                            </span>
                          ) : (
                            <span className="text-sm tabular-nums text-ink">
                              {game.price ? inr(game.price) : '—'}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          {game.metacritic ? (
                            <span
                              className={`font-semibold tabular-nums ${ratingClass(game.metacritic)}`}
                            >
                              {game.metacritic}
                            </span>
                          ) : (
                            <span className="text-ink-subtle">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-sm tabular-nums text-ink-muted">
                          {(game.total_reviews ?? 0).toLocaleString()}
                        </td>
                        <td className="px-5 py-3 text-sm text-ink-muted">
                          {formatDate(game.release_date)}
                        </td>
                        <td className="max-w-[12rem] truncate px-5 py-3 text-sm text-ink-muted">
                          {game.publisher}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between gap-4 border-t border-edge bg-ground/60 px-5 py-3.5">
              <p className="text-sm text-ink-muted">
                Page <span className="tabular-nums text-ink">{page}</span> of{' '}
                <span className="tabular-nums text-ink">{totalPages}</span>
                <span className="hidden sm:inline">
                  {' '}
                  · {stats.filtered_count.toLocaleString()} results
                </span>
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1 || loading}
                  className="rounded-lg border border-edge bg-surface-raised px-3.5 py-1.5 text-sm text-ink transition-colors hover:border-edge-strong disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages || loading}
                  className="rounded-lg bg-pulse px-3.5 py-1.5 text-sm font-medium text-ground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
