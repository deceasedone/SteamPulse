import React from 'react';
import { AlertTriangle, BarChart3 } from 'lucide-react';

interface ChartContainerProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  isLoading?: boolean;
  error?: string;
  isEmpty?: boolean;
  height?: string;
  action?: React.ReactNode;
}

export function ChartContainer({
  title,
  subtitle,
  children,
  isLoading,
  error,
  isEmpty,
  height = 'h-[400px]',
  action,
}: ChartContainerProps) {
  return (
    <section className="panel p-5 sm:p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-ink">{title}</h2>
          {subtitle && (
            <p className="mt-1 text-sm text-ink-muted">{subtitle}</p>
          )}
        </div>
        {action}
      </div>

      {isLoading ? (
        <div className={`flex items-center justify-center ${height}`}>
          <div className="flex flex-col items-center gap-3">
            <div className="relative h-9 w-9">
              <div className="absolute inset-0 rounded-full border-[3px] border-edge" />
              <div className="absolute inset-0 animate-spin rounded-full border-[3px] border-pulse border-t-transparent" />
            </div>
            <p className="text-sm text-ink-muted">Loading…</p>
          </div>
        </div>
      ) : error ? (
        <div className={`flex items-center justify-center ${height}`} role="alert">
          <div className="max-w-sm text-center">
            <AlertTriangle
              className="mx-auto mb-3 h-8 w-8 text-danger"
              aria-hidden="true"
            />
            <p className="mb-1 font-medium text-danger">Couldn&apos;t load this chart</p>
            <p className="text-sm text-ink-subtle">{error}</p>
          </div>
        </div>
      ) : isEmpty ? (
        <div className={`flex items-center justify-center ${height}`}>
          <div className="text-center">
            <BarChart3
              className="mx-auto mb-3 h-8 w-8 text-ink-subtle"
              aria-hidden="true"
            />
            <p className="text-sm text-ink-muted">No data for this selection</p>
          </div>
        </div>
      ) : (
        <div className={height}>{children}</div>
      )}
    </section>
  );
}
