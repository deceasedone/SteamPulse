"use client";

import { useEffect, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';

interface TrendData {
  genre: string;
  total_games: number;
  avg_price: number;
  avg_rating: number;
}

export default function TrendsPage() {
  const [data, setData] = useState<TrendData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/trends')
      .then((res) => res.json())
      .then((data) => {
        setData(data);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-10 text-white animate-pulse">Loading BigQuery Data...</div>;

  return (
    <div className="min-h-screen bg-[#0b1016] text-slate-200 p-8">
      <h1 className="text-3xl font-bold text-white mb-8">Genre Market Analysis</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* CHART 1: Quantity by Genre */}
        <div className="bg-[#1b2838] p-6 rounded-xl border border-slate-700">
          <h2 className="text-lg font-semibold mb-4 text-[#66c0f4]">Most Popular Genres (Count)</h2>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis type="number" stroke="#8b9bb4" />
                <YAxis dataKey="genre" type="category" stroke="#fff" width={100} style={{fontSize: '12px'}} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                <Bar dataKey="total_games" fill="#66c0f4" radius={[0, 4, 4, 0]} name="Total Games" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 2: Price vs Quality */}
        <div className="bg-[#1b2838] p-6 rounded-xl border border-slate-700">
          <h2 className="text-lg font-semibold mb-4 text-[#a3cf06]">Avg Price (INR) by Genre</h2>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="genre" stroke="#8b9bb4" angle={-45} textAnchor="end" height={80} />
                <YAxis stroke="#fff" />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                <Bar dataKey="avg_price" fill="#a3cf06" radius={[4, 4, 0, 0]} name="Avg Price (₹)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}