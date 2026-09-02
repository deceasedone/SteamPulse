import { Boxes, Gem, Target } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import {
  PublisherConsistencyChart,
  PublisherVolumeChart,
} from '@/components/charts/PublisherCharts';
import { getPublishers } from '@/lib/queries';
import type { PublisherStats } from '@/lib/types';

export const revalidate = 3600;

export const metadata = {
  title: 'Publisher leaderboard',
  description:
    'Steam publishers ranked by catalogue size, average rating and quality consistency.',
};

type Insight = {
  key: string;
  title: string;
  blurb: string;
  Icon: typeof Target;
  accent: string;
  rows: PublisherStats[];
  metric: (p: PublisherStats) => string;
  metricLabel: string;
};

function buildInsights(list: PublisherStats[]): Insight[] {
  return [
    {
      key: 'consistent',
      title: 'Most consistent',
      blurb: 'Narrowest rating spread, 5+ rated titles',
      Icon: Target,
      accent: 'text-lime',
      // Consistency is low variance, not a high mean.
      rows: list
        .filter((p) => p.rating_stddev !== null && p.rated_games >= 5)
        .sort((a, b) => (a.rating_stddev ?? 0) - (b.rating_stddev ?? 0))
        .slice(0, 5),
      metric: (p) => `σ ${p.rating_stddev}`,
      metricLabel: 'spread',
    },
    {
      key: 'quality',
      title: 'Quality over quantity',
      blurb: 'Highest average rating, 5–49 titles',
      Icon: Gem,
      accent: 'text-pulse',
      rows: list
        .filter(
          (p) => p.total_games >= 5 && p.total_games < 50 && p.avg_rating !== null,
        )
        .sort((a, b) => (b.avg_rating ?? 0) - (a.avg_rating ?? 0))
        .slice(0, 5),
      metric: (p) => String(p.avg_rating ?? '—'),
      metricLabel: 'avg rating',
    },
    {
      key: 'volume',
      title: 'Volume champions',
      blurb: 'Largest catalogues in the dataset',
      Icon: Boxes,
      accent: 'text-ink',
      rows: [...list].sort((a, b) => b.total_games - a.total_games).slice(0, 5),
      metric: (p) => p.total_games.toLocaleString(),
      metricLabel: 'games',
    },
  ];
}

export default async function PublisherPage() {
  const publishers = await getPublishers(100);
  const insights = buildInsights(publishers);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Publishers"
        title="Publisher"
        titleAccent="leaderboard"
        description="Who ships the most, who scores the highest, and who does it most predictably."
      />

      <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <PublisherVolumeChart data={publishers} />
        <PublisherConsistencyChart data={publishers} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {insights.map(
          ({ key, title, blurb, Icon, accent, rows, metric, metricLabel }) => (
            <section key={key} className="panel p-5">
              <div className="mb-1 flex items-center gap-2.5">
                <Icon className={`h-5 w-5 ${accent}`} aria-hidden="true" />
                <h2 className="text-base font-semibold text-ink">{title}</h2>
              </div>
              <p className="mb-4 text-sm text-ink-muted">{blurb}</p>

              {rows.length === 0 ? (
                <p className="py-8 text-center text-sm text-ink-subtle">
                  Not enough rated titles to rank
                </p>
              ) : (
                <ol className="space-y-2">
                  {rows.map((p, i) => (
                    <li
                      key={p.publisher}
                      className="flex items-center gap-3 rounded-lg bg-surface-raised px-3 py-2.5"
                    >
                      <span className="w-5 shrink-0 text-sm font-semibold tabular-nums text-ink-subtle">
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink">
                          {p.publisher}
                        </p>
                        <p className="text-xs text-ink-subtle">
                          {p.total_games} games · {p.high_quality_games} rated 75+
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className={`text-sm font-semibold tabular-nums ${accent}`}>
                          {metric(p)}
                        </p>
                        <p className="text-[10px] text-ink-subtle">{metricLabel}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          ),
        )}
      </div>
    </main>
  );
}
