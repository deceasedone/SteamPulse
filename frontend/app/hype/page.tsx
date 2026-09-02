import { Clock } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { HypeExplorer } from '@/components/HypeExplorer';
import { getCatalogueFreshness, getHype } from '@/lib/queries';

export const revalidate = 3600;

const WINDOW_OPTIONS = [30, 90, 180, 365, 1095];

// Open on the narrowest window that still contains data.
function defaultWindow(stalenessDays: number | null): number {
  if (stalenessDays === null) return 180;
  return WINDOW_OPTIONS.find((w) => w > stalenessDays) ?? 1095;
}

export const metadata = {
  title: 'Hype tracker',
  description:
    'Steam games ranked by review velocity — reviews earned per day since launch.',
};

export default async function HypePage() {
  const { newestRelease, stalenessDays } = await getCatalogueFreshness();
  const initialWindow = defaultWindow(stalenessDays);
  const initialGames = await getHype(initialWindow);

  const isStale = stalenessDays !== null && stalenessDays > 60;

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Hype"
        title="Review velocity"
        titleAccent="tracker"
        description="Reviews earned per day since launch — a proxy for how fast a title is picking up players right now."
      />

      {isStale && (
        <div
          role="status"
          className="mb-6 flex items-start gap-3 rounded-xl border border-warn/30 bg-warn/8 px-4 py-3"
        >
          <Clock
            className="mt-0.5 h-4 w-4 shrink-0 text-warn"
            aria-hidden="true"
          />
          <p className="text-sm text-ink-muted">
            <span className="font-medium text-ink">Catalogue is stale.</span> The
            newest tracked release is{' '}
            <time dateTime={newestRelease ?? undefined}>{newestRelease}</time> —{' '}
            {stalenessDays} days ago. Velocity is measured against today, so short
            windows will be empty until the ingestion pipeline runs again.
          </p>
        </div>
      )}

      <HypeExplorer initialGames={initialGames} initialWindow={initialWindow} />
    </main>
  );
}
