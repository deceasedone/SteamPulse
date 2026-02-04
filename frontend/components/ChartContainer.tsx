import React from 'react';

interface ChartContainerProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  isLoading?: boolean;
  error?: string;
  height?: string;
  action?: React.ReactNode;
}

export function ChartContainer({ 
  title, 
  subtitle,
  children, 
  isLoading, 
  error,
  height = 'h-[400px]',
  action
}: ChartContainerProps) {
  return (
    <div className="bg-[#1b2838] p-6 rounded-xl border border-slate-700 hover:border-slate-600 transition-colors">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          {subtitle && <p className="text-sm text-slate-400 mt-1">{subtitle}</p>}
        </div>
        {action}
      </div>
      
      {isLoading ? (
        <div className={`flex items-center justify-center ${height}`}>
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 border-4 border-slate-700 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-[#66c0f4] rounded-full border-t-transparent animate-spin"></div>
            </div>
            <p className="text-slate-400 text-sm">Loading data...</p>
          </div>
        </div>
      ) : error ? (
        <div className={`flex items-center justify-center ${height}`}>
          <div className="text-center">
            <div className="text-red-400 text-4xl mb-2">⚠️</div>
            <p className="text-red-400 font-medium mb-1">Failed to load data</p>
            <p className="text-slate-500 text-sm">{error}</p>
          </div>
        </div>
      ) : React.Children.count(children) === 0 || (Array.isArray(children) && children.length === 0) ? (
        <div className={`flex items-center justify-center ${height}`}>
          <div className="text-center">
            <div className="text-slate-600 text-4xl mb-2">📊</div>
            <p className="text-slate-400">No data available</p>
          </div>
        </div>
      ) : (
        <div className={height}>
          {children}
        </div>
      )}
    </div>
  );
}