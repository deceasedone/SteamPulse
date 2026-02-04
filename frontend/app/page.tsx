"use client";
import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    fetch('/api/stats').then(res => res.json()).then(setStats);
  }, []);

  if (!stats) return <div className="p-10 text-white">Loading Steam Pulse...</div>;

  const pieData = [
    { name: 'Free', value: stats.free_games },
    { name: 'Paid', value: stats.total_games - stats.free_games },
  ];
  const COLORS = ['#a3cf06', '#66c0f4'];

  return (
    <main className="min-h-screen bg-[#0b1016] text-white p-8">
      <h1 className="text-4xl font-bold mb-8">Steam Pulse Dashboard</h1>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <Card title="Total Games Tracked" value={stats.total_games.toLocaleString()} />
        <Card title="Avg Metacritic" value={stats.avg_metacritic} />
        <Card title="Free Games" value={stats.free_games.toLocaleString()} />
      </div>

      {/* Chart */}
      <div className="bg-[#1b2838] p-6 rounded-xl border border-slate-700 w-full md:w-1/2 h-[400px]">
        <h3 className="text-xl font-bold mb-4">Free vs Paid Distribution</h3>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value">
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index]} stroke="none" />
              ))}
            </Pie>
            <Tooltip contentStyle={{backgroundColor: '#0f172a', border: 'none'}} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </main>
  );
}

function Card({ title, value }: { title: string, value: string }) {
  return (
    <div className="bg-[#1b2838] p-6 rounded-xl border border-slate-700">
      <p className="text-slate-400 text-sm">{title}</p>
      <p className="text-3xl font-bold mt-2 text-[#66c0f4]">{value}</p>
    </div>
  );
}