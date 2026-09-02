'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartContainer } from '@/components/ChartContainer';
import type { DashboardStats, GamesPerYear, GenreCount } from '@/lib/types';
import {
  CHART,
  axisTick,
  cursorFill,
  tooltipItemStyle,
  tooltipLabelStyle,
  tooltipStyle,
  truncate,
} from './theme';

interface Props {
  stats: DashboardStats;
  yearlyTrend: GamesPerYear[];
  topGenres: GenreCount[];
}

export function DashboardCharts({ stats, yearlyTrend, topGenres }: Props) {
  const pieData = [
    { name: 'Free to play', value: stats.free_games },
    { name: 'Paid', value: stats.paid_games },
  ];
  const pieColors = [CHART.lime, CHART.pulse];

  return (
    <>
      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartContainer
          title="Free vs paid"
          subtitle="Business-model split across the tracked catalogue"
          isEmpty={stats.free_games + stats.paid_games === 0}
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={72}
                outerRadius={116}
                paddingAngle={2}
                dataKey="value"
                stroke="none"
                label={({ name, percent }) =>
                  `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`
                }
                labelLine={false}
              >
                {pieData.map((entry, i) => (
                  <Cell key={entry.name} fill={pieColors[i]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={tooltipStyle}
                labelStyle={tooltipLabelStyle}
                itemStyle={tooltipItemStyle}
                formatter={(v?: number) => [(v ?? 0).toLocaleString(), 'Games']}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>

        <ChartContainer
          title="Most common genres"
          subtitle="By number of titles"
          isEmpty={topGenres.length === 0}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={topGenres}
              layout="vertical"
              margin={{ left: 8, right: 16, top: 4, bottom: 4 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={CHART.grid}
                horizontal={false}
              />
              <XAxis type="number" tick={axisTick} axisLine={false} tickLine={false} />
              <YAxis
                dataKey="genre"
                type="category"
                tick={axisTick}
                axisLine={false}
                tickLine={false}
                width={96}
                tickFormatter={(v: string) => truncate(v, 14)}
              />
              <Tooltip
                cursor={cursorFill}
                contentStyle={tooltipStyle}
                labelStyle={tooltipLabelStyle}
                itemStyle={tooltipItemStyle}
                formatter={(v?: number) => [(v ?? 0).toLocaleString(), 'Games']}
              />
              <Bar
                dataKey="game_count"
                fill={CHART.pulse}
                radius={[0, 6, 6, 0]}
                name="Games"
                maxBarSize={26}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>

      <ChartContainer
        title="Releases over time"
        subtitle="Annual release volume (left) against average Metacritic (right)"
        height="h-[420px]"
        isEmpty={yearlyTrend.length === 0}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={yearlyTrend}
            margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
            <XAxis
              dataKey="year"
              tick={axisTick}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              yAxisId="left"
              tick={{ ...axisTick, fill: CHART.pulse }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={[0, 100]}
              tick={{ ...axisTick, fill: CHART.lime }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              labelStyle={tooltipLabelStyle}
              itemStyle={tooltipItemStyle}
            />
            <Legend
              wrapperStyle={{ paddingTop: 16, fontSize: 13 }}
              iconType="circle"
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="game_count"
              stroke={CHART.pulse}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5 }}
              name="Games released"
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="avg_rating"
              stroke={CHART.lime}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5 }}
              name="Avg Metacritic"
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartContainer>
    </>
  );
}
