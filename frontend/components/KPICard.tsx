interface KPICardProps {
  label: string;
  value: string | number;
  change?: number;
  icon?: React.ReactNode;
  isLoading?: boolean;
  trend?: 'up' | 'down' | 'neutral';
  sublabel?: string;
}

export function KPICard({ 
  label, 
  value, 
  change, 
  icon, 
  isLoading,
  trend = 'neutral',
  sublabel 
}: KPICardProps) {
  if (isLoading) {
    return (
      <div className="bg-[#1b2838] p-6 rounded-xl border border-slate-700 animate-pulse">
        <div className="h-4 bg-slate-700 rounded w-2/3 mb-4"></div>
        <div className="h-8 bg-slate-700 rounded w-1/2"></div>
      </div>
    );
  }

  const trendColors = {
    up: 'text-[#a3cf06]',
    down: 'text-red-400',
    neutral: 'text-slate-400'
  };

  return (
    <div className="bg-[#1b2838] p-6 rounded-xl border border-slate-700 hover:border-[#66c0f4] transition-all duration-300 group">
      <div className="flex items-center justify-between mb-2">
        <p className="text-slate-400 text-sm font-medium">{label}</p>
        {icon && <div className="text-[#66c0f4] opacity-70 group-hover:opacity-100 transition-opacity">{icon}</div>}
      </div>
      
      <p className="text-3xl font-bold text-white mb-1 group-hover:text-[#66c0f4] transition-colors">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      
      {sublabel && (
        <p className="text-xs text-slate-500">{sublabel}</p>
      )}
      
      {change !== undefined && (
        <div className="flex items-center gap-1 mt-2">
          <span className={`text-sm font-medium ${trendColors[trend]}`}>
            {change > 0 ? '↑' : change < 0 ? '↓' : '→'} {Math.abs(change)}%
          </span>
          <span className="text-xs text-slate-500">vs last period</span>
        </div>
      )}
    </div>
  );
}