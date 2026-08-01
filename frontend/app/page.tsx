"use client";

import { useEffect, useState } from 'react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Legend,
  BarChart, Bar
} from 'recharts';
import { KPICard } from '@/components/KPICard';
import { ChartContainer } from '@/components/ChartContainer';

interface DashboardData {
  stats: {
    total_games: number;
    avg_price: number;
    avg_metacritic: number;
    median_price: number;
    free_games: number;
    paid_games: number;
    total_reviews: number;
    free_percentage: number;
  };
  yearlyTrend: Array<{
    year: number;
    game_count: number;
    avg_price: number;
    avg_rating: number;
  }>;
  topGenres: Array<{
    genre: string;
    game_count: number;
  }>;
  lastUpdated: string;
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    fetch('/api/dashboard')
      .then(res => res.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setData(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const pieData = data ? [
    { name: 'Free to Play', value: data.stats.free_games },
    { name: 'Paid Games', value: data.stats.paid_games },
  ] : [];

  const COLORS = ['#a3cf06', '#66c0f4'];

  return (
    <main className="min-h-screen bg-[#0b1016] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-[#66c0f4] to-[#a3cf06] bg-clip-text text-transparent">
              Dashboard Overview
            </h1>
            <p className="text-slate-400">
              Comprehensive analytics for 10,000+ Steam games
            </p>
          </div>
          {data && (
            <span className="flex items-center gap-2 text-xs text-slate-500 bg-[#1b2838] border border-slate-700 rounded-full px-3 py-1.5 w-fit">
              <span className="w-2 h-2 rounded-full bg-[#a3cf06] animate-pulse" />
              Updated {new Date(data.lastUpdated).toLocaleString()}
            </span>
          )}
        </div>

        {/* KPI Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <KPICard
            label="Total Games Tracked"
            value={data?.stats.total_games || 0}
            isLoading={loading}
            icon={<span className="text-2xl">🎮</span>}
            sublabel="Across all genres"
          />
          <KPICard
            label="Average Metacritic Score"
            value={data?.stats.avg_metacritic || 0}
            isLoading={loading}
            icon={<span className="text-2xl">⭐</span>}
            trend="neutral"
          />
          <KPICard
            label="Median Price"
            value={data ? `₹${data.stats.median_price.toLocaleString()}` : '₹0'}
            isLoading={loading}
            icon={<span className="text-2xl">💰</span>}
            sublabel={data ? `Avg: ₹${data.stats.avg_price.toLocaleString()}` : ''}
          />
          <KPICard
            label="Free to Play"
            value={data ? `${data.stats.free_percentage}%` : '0%'}
            isLoading={loading}
            icon={<span className="text-2xl">🆓</span>}
            sublabel={data ? `${data.stats.free_games.toLocaleString()} games` : ''}
          />
        </div>

        {/* Secondary KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          <KPICard
            label="Total Player Reviews"
            value={data ? `${(data.stats.total_reviews / 1000000).toFixed(1)}M` : '0'}
            isLoading={loading}
            icon={<span className="text-2xl">💬</span>}
            sublabel="Lifetime engagement"
          />
          <KPICard
            label="Paid Games"
            value={data?.stats.paid_games || 0}
            isLoading={loading}
            icon={<span className="text-2xl">💳</span>}
          />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
          {/* Free vs Paid Pie Chart */}
          <ChartContainer
            title="Free vs Paid Distribution"
            subtitle="Business model breakdown"
            isLoading={loading}
            error={error}
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={pieData} 
                  cx="50%" 
                  cy="50%" 
                  innerRadius={80} 
                  outerRadius={130} 
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index]} stroke="none" />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#0f172a', 
                    border: '1px solid #334155',
                    borderRadius: '8px'
                  }} 
                  itemStyle={{ color: '#ffffff' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>

          {/* Top Genres Bar Chart */}
          <ChartContainer
            title="Most Popular Genres"
            subtitle="By game count"
            isLoading={loading}
            error={error}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.topGenres || []} layout="vertical" margin={{ left: 80 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis type="number" stroke="#8b9bb4" />
                <YAxis 
                  dataKey="genre" 
                  type="category" 
                  stroke="#fff" 
                  width={70}
                  style={{ fontSize: '12px' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#0f172a', 
                    borderColor: '#334155',
                    borderRadius: '8px'
                  }} 
                />
                <Bar 
                  dataKey="game_count" 
                  fill="#66c0f4" 
                  radius={[0, 8, 8, 0]} 
                  name="Games"
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>

        {/* Release Trend Line Chart - Full Width */}
        <ChartContainer
          title="Games Released Over Time"
          subtitle="Annual release trends since 2010 · dual-axis: releases (left) vs rating (right)"
          isLoading={loading}
          error={error}
          height="h-[500px]"
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data?.yearlyTrend || []} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
              <XAxis 
                dataKey="year" 
                stroke="#8b9bb4"
                style={{ fontSize: '12px' }}
              />
              <YAxis 
                yAxisId="left"
                stroke="#66c0f4"
                style={{ fontSize: '12px' }}
                label={{ value: 'Games Released', angle: -90, position: 'insideLeft', fill: '#66c0f4', fontSize: 12 }}
              />
              <YAxis 
                yAxisId="right"
                orientation="right"
                stroke="#a3cf06"
                domain={[0, 100]}
                style={{ fontSize: '12px' }}
                label={{ value: 'Avg Metacritic', angle: 90, position: 'insideRight', fill: '#a3cf06', fontSize: 12 }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#0f172a', 
                  borderColor: '#334155',
                  borderRadius: '8px'
                }} 
                labelStyle={{ color: '#fff', fontWeight: 600 }}
              />
              <Legend 
                wrapperStyle={{ 
                  paddingTop: '20px',
                  fontSize: '14px'
                }}
              />
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="game_count" 
                stroke="#66c0f4" 
                strokeWidth={3}
                dot={{ fill: '#66c0f4', r: 4 }}
                name="Games Released"
                activeDot={{ r: 6 }}
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="avg_rating" 
                stroke="#a3cf06" 
                strokeWidth={2}
                dot={{ fill: '#a3cf06', r: 3 }}
                name="Avg Metacritic"
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>
    </main>
  );
}