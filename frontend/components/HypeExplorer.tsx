'use client';

import { useEffect, useState, useTransition } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Flame, Sparkles, TrendingUp } from 'lucide-react';
import { ChartContainer } from '@/components/ChartContainer';
import type { HypeScore } from '@/lib/types';
import {
  CHART,
  axisTick,
  compact,
  cursorFill,
  tooltipItemStyle,
  tooltipLabelStyle,
  tooltipStyle,
  truncate,
} from '@/components/charts/theme';

const WINDOWS = [
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
  { days: 180, label: '6 months' },
  { days: 365, label: '1 year' },
  { days: 1095, label: '3 years' },
] as const;

interface Props {
  initialGames: HypeScore[];
  initialWindow: number;
}

export function HypeExplorer({ initialGames, initialWindow }: Props) {
  const [days, setDays] = useState(initialWindow);
  const [games, setGames] = useState<HypeScore[]>(initialGames);
  const [error, setError] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    // The server already rendered this window; skip the redundant refetch.
    if (days === initialWindow) {
      setGames(initialGames);
      setError(undefined);
      return;
    }

    const controller = new AbortController();
    startTransition(() => {});

    (async () => {
      try {
        setError(undefined);
        const res = await fetch(`/api/hype?days=${days}`, {
          signal: controller.signal,
        });
        if (!res.ok) {
          throw new Error(
            res.status === 429
              ? 'Too many requests — give it a moment.'
              : `Request failed (${res.status})`,
          );
        }
        const json = await res.json();
        setGames(json.all ?? []);
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        setError((err as Error).message);
        setGames([]);
      }
    })();

    return () => controller.abort();
  }, [days, initialWindow, initialGames]);

  // Bucket by actual age so a game cannot appear in two columns.
  const fresh = games.filter((g) => g.days_since_release <= 30);
  const recent = games.filter(
    (g) => g.days_since_release > 30 && g.days_since_release <= 180,
  );
  const established = games.filter((g) => g.days_since_release > 180);

  const columns = [
    {
      key: 'fresh',
      title: 'New releases',
      blurb: 'Launched in the last 30 days',
      Icon: Sparkles,
      accent: 'text-lime',
      rows: fresh,
    },
    {
      key: 'recent',
      title: 'Recent hits',
      blurb: '1–6 months since launch',
      Icon: TrendingUp,
      accent: 'text-pulse',
      rows: recent,
    },
    {
      key: 'established',
      title: 'Long-term success',
      blurb: 'Older than 6 months, still earning reviews',
      Icon: Flame,
      accent: 'text-warn',
      rows: established,
    },
  ];

  const chartData = games.slice(0, 12);

  return (
    <>
      <div
        className="mb-6 flex flex-wrap items-center gap-2"
        role="group"
        aria-label="Release window"
      >
        <span className="mr-1 text-sm text-ink-muted">Released within:</span>
        {WINDOWS.map((w) => (
          <button
            key={w.days}
            type="button"
            onClick={() => setDays(w.days)}
            aria-pressed={days === w.days}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
              days === w.days
                ? 'border-pulse/50 bg-pulse/12 text-pulse'
                : 'border-edge bg-surface text-ink-muted hover:border-edge-strong hover:text-ink'
            }`}
          >
            {w.label}
          </button>
        ))}
      </div>

      <div className="mb-8">
        <ChartContainer
          title="Fastest-growing titles"
          subtitle="Reviews per day since launch"
          height="h-[500px]"
          isLoading={isPending}
          error={error}
          isEmpty={chartData.length === 0}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ left: 8, right: 32 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={CHART.grid}
                horizontal={false}
              />
              <XAxis
                type="number"
                tick={axisTick}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                dataKey="name"
                type="category"
                tick={axisTick}
                axisLine={false}
                tickLine={false}
                width={176}
                tickFormatter={(v: string) => truncate(v, 24)}
              />
              <Tooltip
                cursor={cursorFill}
                contentStyle={tooltipStyle}
                labelStyle={tooltipLabelStyle}
                itemStyle={tooltipItemStyle}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload as HypeScore;
                  return (
                    <div style={tooltipStyle}>
                      <p style={tooltipLabelStyle}>{d.name}</p>
                      <p style={tooltipItemStyle}>
                        {d.hype_score.toLocaleString()} reviews/day
                      </p>
                      <p style={tooltipItemStyle}>
                        {compact(d.total_reviews)} reviews ·{' '}
                        {d.days_since_release.toLocaleString()} days old
                      </p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="hype_score" radius={[0, 6, 6, 0]} maxBarSize={22}>
                {chartData.map((entry) => (
                  <Cell
                    key={entry.appid}
                    fill={
                      entry.days_since_release <= 30
                        ? CHART.lime
                        : entry.days_since_release <= 180
                          ? CHART.pulse
                          : CHART.warn
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {columns.map(({ key, title, blurb, Icon, accent, rows }) => (
          <section key={key} className="panel p-5">
            <div className="mb-1 flex items-center gap-2.5">
              <Icon className={`h-5 w-5 ${accent}`} aria-hidden="true" />
              <h2 className="text-base font-semibold text-ink">{title}</h2>
            </div>
            <p className="mb-4 text-sm text-ink-muted">{blurb}</p>

            {rows.length === 0 ? (
              <p className="py-8 text-center text-sm text-ink-subtle">
                Nothing in this bracket for the selected window
              </p>
            ) : (
              <ol className="space-y-2">
                {rows.slice(0, 5).map((game, i) => (
                  <li
                    key={game.appid}
                    className="flex items-center gap-3 rounded-lg bg-surface-raised px-3 py-2.5"
                  >
                    <span className="w-5 shrink-0 text-sm font-semibold tabular-nums text-ink-subtle">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <a
                        href={`https://store.steampowered.com/app/${game.appid}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate text-sm font-medium text-ink hover:text-pulse"
                      >
                        {game.name}
                      </a>
                      <p className="truncate text-xs text-ink-subtle">
                        {game.primary_genre ?? 'Uncategorised'}
                        {game.metacritic ? ` · ★ ${game.metacritic}` : ''}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className={`text-sm font-semibold tabular-nums ${accent}`}>
                        {Math.round(game.hype_score).toLocaleString()}
                      </p>
                      <p className="text-[10px] text-ink-subtle">rev/day</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        ))}
      </div>
    </>
  );
}
