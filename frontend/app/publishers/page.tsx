"use client";

import { useEffect, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, ZAxis, Legend
} from 'recharts';
import { ChartContainer } from '@/components/ChartContainer';
import type { PublisherStats } from '@/lib/types';

// API Response only has the list now
interface PublisherData {
  publishers: PublisherStats[];
}

// We calculate this locally
interface InsightState {
  mostConsistent: PublisherStats[];
  qualityOverQuantity: PublisherStats[];
  volumePublishers: PublisherStats[];
}

export default function PublisherLeaderboard() {
  const [publishers, setPublishers] = useState<PublisherStats[]>([]);
  
  // Initialize insights as empty arrays so the UI doesn't crash
  const [insights, setInsights] = useState<InsightState>({
    mostConsistent: [],
    qualityOverQuantity: [],
    volumePublishers: []
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    fetch('/api/publishers')
      .then(res => res.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        
        // 1. Save the raw list
        const rawList: PublisherStats[] = data.publishers || [];
        setPublishers(rawList);

        // 2. Calculate Insights Locally (No more crashing!)
        
        // Volume: Sort by total_games descending
        const volume = [...rawList]
          .sort((a, b) => b.total_games - a.total_games)
          .slice(0, 5);

        // Quality: Filter > 5 games, sort by rating
        const quality = rawList
          .filter(p => p.total_games >= 5 && p.total_games < 50)
          .sort((a, b) => b.avg_rating - a.avg_rating)
          .slice(0, 5);

        // Consistent: (Proxy logic) High rating + decent volume (>10 games)
        const consistent = rawList
          .filter(p => p.total_games >= 10)
          .sort((a, b) => b.avg_rating - a.avg_rating) // Prioritize rating
          .slice(0, 5);

        setInsights({
          volumePublishers: volume,
          qualityOverQuantity: quality,
          mostConsistent: consistent
        });

        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const top20Publishers = publishers.slice(0, 20) || [];

  return (
    <div className="min-h-screen bg-[#0b1016] text-white p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-[#66c0f4] to-[#a3cf06] bg-clip-text text-transparent">
          Publisher Leaderboard
        </h1>
        <p className="text-slate-400">Discover the top game publishers on Steam</p>
      </div>

      {/* Main Leaderboard Chart */}
      <div className="mb-10">
        <ChartContainer
          title="Top 20 Publishers by Game Count"
          subtitle="Publishers with the largest game portfolios"
          isLoading={loading}
          error={error}
          height="h-[600px]"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={top20Publishers} 
              layout="vertical" 
              margin={{ left: 150, right: 30 }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
              <XAxis type="number" stroke="#8b9bb4" />
              <YAxis 
                dataKey="publisher" 
                type="category" 
                stroke="#fff" 
                width={140}
                style={{ fontSize: '13px' }}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                itemStyle={{ color: '#fff' }}
              />
              <Bar dataKey="total_games" fill="#66c0f4" radius={[0, 8, 8, 0]} name="Total Games" />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>

      {/* Insights Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Most Consistent Publishers */}
        <div className="bg-[#1b2838] p-6 rounded-xl border border-slate-700">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">🎯</span>
            <h3 className="text-lg font-semibold text-[#66c0f4]">Best Rated (Mid-Size)</h3>
          </div>
          <p className="text-sm text-slate-400 mb-4">High ratings with 10+ games</p>
          <div className="space-y-3">
            {insights.mostConsistent.map((pub, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-[#0b1016] rounded">
                <div>
                  <p className="font-medium text-sm truncate max-w-[150px]">{pub.publisher}</p>
                  <p className="text-xs text-slate-500">{pub.total_games} games</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-[#66c0f4] font-bold">{pub.avg_rating}</p>
                  <p className="text-xs text-slate-500">rating</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quality Over Quantity */}
        <div className="bg-[#1b2838] p-6 rounded-xl border border-slate-700">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">💎</span>
            <h3 className="text-lg font-semibold text-[#a3cf06]">Quality Over Quantity</h3>
          </div>
          <p className="text-sm text-slate-400 mb-4">Highest ratings (Small Portfolio)</p>
          <div className="space-y-3">
            {insights.qualityOverQuantity.map((pub, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-[#0b1016] rounded">
                <div>
                  <p className="font-medium text-sm truncate max-w-[150px]">{pub.publisher}</p>
                  <p className="text-xs text-slate-500">{pub.total_games} games</p>
                </div>
                <div className="text-right">
                  <p className="text-lg text-[#a3cf06] font-bold">{pub.avg_rating}</p>
                  <p className="text-xs text-slate-500">rating</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Volume Publishers */}
        <div className="bg-[#1b2838] p-6 rounded-xl border border-slate-700">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">📦</span>
            <h3 className="text-lg font-semibold text-white">Volume Champions</h3>
          </div>
          <p className="text-sm text-slate-400 mb-4">Most games published</p>
          <div className="space-y-3">
            {insights.volumePublishers.map((pub, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-[#0b1016] rounded">
                <div>
                  <p className="font-medium text-sm truncate max-w-[150px]">{pub.publisher}</p>
                  <p className="text-xs text-slate-500">{pub.avg_rating} avg</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl text-[#66c0f4] font-bold">{pub.total_games}</p>
                  <p className="text-xs text-slate-500">games</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}