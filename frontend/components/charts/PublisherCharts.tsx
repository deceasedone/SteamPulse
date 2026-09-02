'use client';

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
import { ChartContainer } from '@/components/ChartContainer';
import type { PublisherStats } from '@/lib/types';
import {
  CHART,
  axisTick,
  cursorFill,
  tooltipItemStyle,
  tooltipLabelStyle,
  tooltipStyle,
  truncate,
} from './theme';

export function PublisherVolumeChart({ data }: { data: PublisherStats[] }) {
  const top = data.slice(0, 20);

  return (
    <ChartContainer
      title="Largest catalogues"
      subtitle="Top 20 publishers by number of tracked titles"
      height="h-[560px]"
      isEmpty={top.length === 0}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={top} layout="vertical" margin={{ left: 8, right: 24 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={CHART.grid}
            horizontal={false}
          />
          <XAxis type="number" tick={axisTick} axisLine={false} tickLine={false} />
          <YAxis
            dataKey="publisher"
            type="category"
            tick={axisTick}
            axisLine={false}
            tickLine={false}
            width={150}
            tickFormatter={(v: string) => truncate(v, 20)}
          />
          <Tooltip
            cursor={cursorFill}
            contentStyle={tooltipStyle}
            labelStyle={tooltipLabelStyle}
            itemStyle={tooltipItemStyle}
            formatter={(v?: number) => [(v ?? 0).toLocaleString(), 'Games']}
          />
          <Bar
            dataKey="total_games"
            fill={CHART.pulse}
            radius={[0, 6, 6, 0]}
            maxBarSize={20}
            name="Games"
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}

/** Lower std-dev means a studio's catalogue lands in a narrow quality band. */
export function PublisherConsistencyChart({ data }: { data: PublisherStats[] }) {
  const ranked = data
    .filter((p) => p.rating_stddev !== null && p.rated_games >= 5)
    .sort((a, b) => (a.rating_stddev ?? 0) - (b.rating_stddev ?? 0))
    .slice(0, 15);

  const colourFor = (sd: number) =>
    sd <= 5 ? CHART.lime : sd <= 10 ? CHART.pulse : CHART.warn;

  return (
    <ChartContainer
      title="Most consistent publishers"
      subtitle="Standard deviation of Metacritic across the catalogue — lower is steadier. Minimum 5 rated titles."
      height="h-[480px]"
      isEmpty={ranked.length === 0}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={ranked} layout="vertical" margin={{ left: 8, right: 24 }}>
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
            label={{
              value: 'Rating spread (σ)',
              position: 'insideBottom',
              offset: -4,
              fill: CHART.axis,
              fontSize: 12,
            }}
          />
          <YAxis
            dataKey="publisher"
            type="category"
            tick={axisTick}
            axisLine={false}
            tickLine={false}
            width={150}
            tickFormatter={(v: string) => truncate(v, 20)}
          />
          <Tooltip
            cursor={cursorFill}
            contentStyle={tooltipStyle}
            labelStyle={tooltipLabelStyle}
            itemStyle={tooltipItemStyle}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as PublisherStats;
              return (
                <div style={tooltipStyle}>
                  <p style={tooltipLabelStyle}>{d.publisher}</p>
                  <p style={tooltipItemStyle}>Spread: σ {d.rating_stddev}</p>
                  <p style={tooltipItemStyle}>Avg rating: {d.avg_rating ?? '—'}</p>
                  <p style={tooltipItemStyle}>Rated titles: {d.rated_games}</p>
                </div>
              );
            }}
          />
          <Bar dataKey="rating_stddev" radius={[0, 6, 6, 0]} maxBarSize={20}>
            {ranked.map((entry) => (
              <Cell
                key={entry.publisher}
                fill={colourFor(entry.rating_stddev ?? 0)}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
