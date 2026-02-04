"use client";

import { useEffect, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { ChartContainer } from '@/components/ChartContainer';
import type { HypeScore } from '@/lib/types';

interface HypeData {
  all: HypeScore[];
}

interface CategoryState {
  newReleases: HypeScore[];
  recentReleases: HypeScore[];
  established: HypeScore[];
}

export default function HypeTracker() {
  const [data, setData] = useState<HypeData | null>(null);
  
  // Initialize categories safely
  const [categories, setCategories] = useState<CategoryState>({
    newReleases: [],
    recentReleases: [],
    established: []
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);
  const [timeWindow, setTimeWindow] = useState(180);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/hype?days=${timeWindow}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        
        setData(data);
        const allGames: HypeScore[] = data.all || [];

        // Calculate categories locally
        const now = new Date();
        const newR: HypeScore[] = [];
        const recentR: HypeScore[] = [];
        const estabR: HypeScore[] = [];

        allGames.forEach(game => {
          // If days_since_release comes from API, use it. Otherwise calc it.
          // Note: API sends days_since_release if dbt calc worked.
          // Fallback logic just in case:
          let diffDays = game.days_since_release;
          if (!diffDays && game.release_date) {
             const d = new Date(game.release_date);
             const diffTime = Math.abs(now.getTime() - d.getTime());
             diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
          }

          if (diffDays <= 30) newR.push(game);
          else if (diffDays <= 90) recentR.push(game);
          else estabR.push(game);
        });

        // If 'New' is empty (common in small datasets), fill with top hype
        setCategories({
          newReleases: newR.length > 0 ? newR : allGames.slice(0, 5),
          recentReleases: recentR.length > 0 ? recentR : allGames.slice(5, 10),
          established: estabR.length > 0 ? estabR : allGames.slice(0, 10)
        });

        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [timeWindow]);

  const getHypeBadge = (rank: number) => {
    if (rank === 0) return <span className="text-2xl">🔥</span>;
    if (rank === 1) return <span className="text-2xl">⚡</span>;
    if (rank === 2) return <span className="text-2xl">💫</span>;
    return null;
  };

  const renderGameCard = (game: HypeScore, index: number) => (
    <div 
      key={game.appid} 
      className="flex items-center gap-4 p-4 bg-[#0b1016] rounded-lg hover:bg-[#141d2b] transition-colors"
    >
      <div className="flex-shrink-0 w-12 text-center">
        {getHypeBadge(index)}
        {!getHypeBadge(index) && (
          <span className="text-2xl font-bold text-slate-600">#{index + 1}</span>
        )}
      </div>
      
      <div className="flex-1 overflow-hidden">
        <h4 className="font-semibold text-white mb-1 truncate">{game.name}</h4>
        <div className="flex items-center gap-4 text-sm text-slate-400">
          <span className="flex items-center gap-1">
            <span className="text-[#66c0f4]">{game.primary_genre}</span>
          </span>
          {game.metacritic && (
            <span className="text-[#a3cf06]">★ {game.metacritic}</span>
          )}
        </div>
      </div>

      <div className="text-right flex-shrink-0">
        <p className="text-xl font-bold text-[#66c0f4]">
          {Math.round(game.hype_score).toLocaleString()}
        </p>
        <p className="text-[10px] text-slate-500">rev/day</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0b1016] text-white p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-[#66c0f4] to-[#a3cf06] bg-clip-text text-transparent">
          🔥 Hype Tracker
        </h1>
        <p className="text-slate-400">Discover the fastest growing games on Steam</p>
      </div>

      {/* Top 10 Chart */}
      <div className="mb-10">
        <ChartContainer
          title="Top 10 Fastest Growing Games"
          subtitle="Ranked by reviews per day"
          isLoading={loading}
          error={error}
          height="h-[500px]"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={data?.all.slice(0, 10) || []} 
              layout="vertical"
              margin={{ left: 180, right: 30 }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
              <XAxis type="number" stroke="#8b9bb4" />
              <YAxis 
                dataKey="name" 
                type="category" 
                stroke="#fff" 
                width={170}
                style={{ fontSize: '12px' }}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                cursor={{fill: '#ffffff', opacity: 0.1}}
                formatter={(value: any, name: string | undefined) => {
                   if(name === 'hype_score') return [Math.round(value), 'Reviews/Day'];
                   return [value, name];
                }}
              />
              <Bar 
                dataKey="hype_score" 
                fill="#66c0f4" 
                radius={[0, 8, 8, 0]} 
                name="Hype Score"
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>

      {/* Categorized Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* New Releases */}
        <div className="bg-[#1b2838] p-6 rounded-xl border border-slate-700">
          <div className="flex items-center gap-2 mb-6">
            <span className="text-2xl">🆕</span>
            <h3 className="text-lg font-semibold text-[#a3cf06]">New Releases</h3>
          </div>
          <div className="space-y-3">
            {categories.newReleases.length > 0 ? (
              categories.newReleases.slice(0, 5).map((game, idx) => renderGameCard(game, idx))
            ) : (
              <div className="text-center py-8 text-slate-500">No data available</div>
            )}
          </div>
        </div>

        {/* Recent Releases */}
        <div className="bg-[#1b2838] p-6 rounded-xl border border-slate-700">
          <div className="flex items-center gap-2 mb-6">
            <span className="text-2xl">📈</span>
            <h3 className="text-lg font-semibold text-[#66c0f4]">Recent Hits</h3>
          </div>
          <div className="space-y-3">
             {categories.recentReleases.length > 0 ? (
              categories.recentReleases.slice(0, 5).map((game, idx) => renderGameCard(game, idx))
            ) : (
              <div className="text-center py-8 text-slate-500">No data available</div>
            )}
          </div>
        </div>

        {/* Established */}
        <div className="bg-[#1b2838] p-6 rounded-xl border border-slate-700">
          <div className="flex items-center gap-2 mb-6">
            <span className="text-2xl">⭐</span>
            <h3 className="text-lg font-semibold text-white">Long-Term Success</h3>
          </div>
          <div className="space-y-3">
             {categories.established.length > 0 ? (
              categories.established.slice(0, 5).map((game, idx) => renderGameCard(game, idx))
            ) : (
              <div className="text-center py-8 text-slate-500">No data available</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}