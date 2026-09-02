import { PageHeader } from '@/components/PageHeader';
import { GameExplorer } from '@/components/GameExplorer';
import { getGames, getGenres } from '@/lib/queries';

export const revalidate = 3600;

export const metadata = {
  title: 'Explore games',
  description:
    'Browse, filter and sort the tracked Steam catalogue by genre, price and rating.',
};

export default async function ExplorePage() {
  // First page rendered server-side so results are visible on load.
  const [initialResult, genreRows] = await Promise.all([
    getGames({ page: 1, limit: 50 }),
    getGenres(),
  ]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Explore"
        title="Game"
        titleAccent="explorer"
        description="Filter and sort the full tracked catalogue. Sorting and paging run in the warehouse, so they apply to every match — not just the visible page."
      />
      <GameExplorer
        initialResult={initialResult}
        genres={genreRows.map((g) => g.genre)}
      />
    </main>
  );
}
