import { PageHeader } from '@/components/PageHeader';
import { TrendsCharts } from '@/components/charts/TrendsCharts';
import { getTrends } from '@/lib/queries';

export const revalidate = 3600;

export const metadata = {
  title: 'Genre trends',
  description:
    'Catalogue size, pricing and the price-to-rating relationship across Steam genres.',
};

export default async function TrendsPage() {
  const data = await getTrends();

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Trends"
        title="Genre market"
        titleAccent="analysis"
        description="How catalogue volume, pricing and critical reception vary across genres."
      />
      <TrendsCharts data={data} />
    </main>
  );
}
