import {
  BadgeIndianRupee,
  Gamepad2,
  Gift,
  MessagesSquare,
  Star,
  Wallet,
} from 'lucide-react';
import { KPICard } from '@/components/KPICard';
import { FreshnessPill, PageHeader } from '@/components/PageHeader';
import { DashboardCharts } from '@/components/charts/DashboardCharts';
import { getDashboardStats } from '@/lib/queries';
import { compact, inr } from '@/components/charts/theme';

// Server-rendered and revalidated hourly: no client-side fetch waterfall.
export const revalidate = 3600;

export default async function DashboardPage() {
  const { stats, yearlyTrend, topGenres, lastUpdated } = await getDashboardStats();

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Overview"
        title="Steam market"
        titleAccent="dashboard"
        description={`Aggregate analytics across ${stats.total_games.toLocaleString()} tracked titles.`}
        action={<FreshnessPill isoDate={lastUpdated} />}
      />

      <div className="mb-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          label="Games tracked"
          value={stats.total_games}
          icon={<Gamepad2 className="h-5 w-5" />}
          accent="pulse"
          sublabel="Across all genres"
        />
        <KPICard
          label="Average Metacritic"
          value={stats.avg_metacritic}
          icon={<Star className="h-5 w-5" />}
          accent="lime"
          sublabel="Rated titles only"
        />
        <KPICard
          label="Median price"
          value={inr(stats.median_price)}
          icon={<BadgeIndianRupee className="h-5 w-5" />}
          accent="pulse"
          sublabel={`Mean ${inr(stats.avg_price)} · paid titles`}
        />
        <KPICard
          label="Free to play"
          value={stats.free_percentage === null ? '—' : `${stats.free_percentage}%`}
          icon={<Gift className="h-5 w-5" />}
          accent="lime"
          sublabel={`${stats.free_games.toLocaleString()} games`}
        />
      </div>

      <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2">
        <KPICard
          label="Total player reviews"
          value={compact(stats.total_reviews)}
          icon={<MessagesSquare className="h-5 w-5" />}
          accent="pulse"
          sublabel="Lifetime engagement across the catalogue"
        />
        <KPICard
          label="Paid titles"
          value={stats.paid_games}
          icon={<Wallet className="h-5 w-5" />}
          accent="neutral"
          sublabel={`${stats.free_games.toLocaleString()} free to play`}
        />
      </div>

      <DashboardCharts
        stats={stats}
        yearlyTrend={yearlyTrend}
        topGenres={topGenres}
      />
    </main>
  );
}
