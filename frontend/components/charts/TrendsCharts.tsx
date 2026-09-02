'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import { ChartContainer } from '@/components/ChartContainer';
import type { GenreStats } from '@/lib/types';
import {
  CHART,
  SERIES,
  axisTick,
  cursorFill,
  inr,
  tooltipItemStyle,
  tooltipLabelStyle,
  tooltipStyle,
  truncate,
} from './theme';

export function TrendsCharts({ data }: { data: GenreStats[] }) {
  const empty = data.length === 0;

  // Only genres with both axes populated can be plotted against each other.
  const scatter = data.filter(
    (d) => d.avg_price !== null && d.avg_rating !== null,
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartContainer
          title="Catalogue size by genre"
          subtitle="Number of tracked titles"
          isEmpty={empty}
          height="h-[420px]"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ left: 8, right: 16 }}
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
                width={104}
                tickFormatter={(v: string) => truncate(v, 15)}
              />
              <Tooltip
                cursor={cursorFill}
                contentStyle={tooltipStyle}
                labelStyle={tooltipLabelStyle}
                itemStyle={tooltipItemStyle}
                formatter={(v?: number) => [(v ?? 0).toLocaleString(), 'Games']}
              />
              <Bar dataKey="total_games" radius={[0, 6, 6, 0]} maxBarSize={22}>
                {data.map((entry, i) => (
                  <Cell key={entry.genre} fill={SERIES[i % SERIES.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>

        <ChartContainer
          title="Average price by genre"
          subtitle="Indian storefront pricing (₹)"
          isEmpty={empty}
          height="h-[420px]"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ left: 0, right: 8, bottom: 56 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
              <XAxis
                dataKey="genre"
                tick={axisTick}
                axisLine={false}
                tickLine={false}
                angle={-42}
                textAnchor="end"
                interval={0}
                height={64}
                tickFormatter={(v: string) => truncate(v, 12)}
              />
              <YAxis tick={axisTick} axisLine={false} tickLine={false} />
              <Tooltip
                cursor={cursorFill}
                contentStyle={tooltipStyle}
                labelStyle={tooltipLabelStyle}
                itemStyle={tooltipItemStyle}
                formatter={(v?: number) => [inr(v), 'Avg price']}
              />
              <Bar
                dataKey="avg_price"
                fill={CHART.lime}
                radius={[6, 6, 0, 0]}
                maxBarSize={44}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>

      <ChartContainer
        title="Price against quality"
        subtitle="Each point is a genre — average price versus average Metacritic. Bubble size is catalogue volume."
        isEmpty={scatter.length === 0}
        height="h-[440px]"
      >
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 16, right: 24, bottom: 44, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
            <XAxis
              type="number"
              dataKey="avg_price"
              name="Avg price"
              tick={axisTick}
              axisLine={false}
              tickLine={false}
              label={{
                value: 'Average price (₹)',
                position: 'insideBottom',
                offset: -24,
                fill: CHART.axis,
                fontSize: 12,
              }}
            />
            <YAxis
              type="number"
              dataKey="avg_rating"
              name="Avg Metacritic"
              domain={[40, 100]}
              tick={axisTick}
              axisLine={false}
              tickLine={false}
              label={{
                value: 'Avg Metacritic',
                angle: -90,
                position: 'insideLeft',
                fill: CHART.axis,
                fontSize: 12,
              }}
            />
            <ZAxis type="number" dataKey="total_games" range={[80, 900]} />
            <Tooltip
              cursor={{ strokeDasharray: '3 3', stroke: CHART.grid }}
              contentStyle={tooltipStyle}
              labelStyle={tooltipLabelStyle}
              itemStyle={tooltipItemStyle}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as GenreStats;
                return (
                  <div style={tooltipStyle}>
                    <p style={tooltipLabelStyle}>{d.genre}</p>
                    <p style={tooltipItemStyle}>Avg price: {inr(d.avg_price)}</p>
                    <p style={tooltipItemStyle}>Avg rating: {d.avg_rating ?? '—'}</p>
                    <p style={tooltipItemStyle}>
                      Games: {d.total_games.toLocaleString()}
                    </p>
                  </div>
                );
              }}
            />
            <Scatter data={scatter} fill={CHART.pulse} fillOpacity={0.75}>
              {scatter.map((entry, i) => (
                <Cell key={entry.genre} fill={SERIES[i % SERIES.length]} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );
}
