import type { ReactNode } from 'react';

interface KPICardProps {
  label: string;
  value: string | number | null | undefined;
  icon?: ReactNode;
  sublabel?: string;
  accent?: 'pulse' | 'lime' | 'neutral';
  isLoading?: boolean;
}

const accentRing = {
  pulse: 'group-hover:border-pulse/50',
  lime: 'group-hover:border-lime/50',
  neutral: 'group-hover:border-edge-strong',
} as const;

const accentText = {
  pulse: 'text-pulse',
  lime: 'text-lime',
  neutral: 'text-ink-muted',
} as const;

/** Em dash rather than "0" or "NaN" when a metric is unavailable. */
function format(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value.toLocaleString() : '—';
  }
  return value;
}

export function KPICard({
  label,
  value,
  icon,
  sublabel,
  accent = 'neutral',
  isLoading,
}: KPICardProps) {
  if (isLoading) {
    return (
      <div className="panel p-5" aria-busy="true">
        <div className="skeleton mb-4 h-3.5 w-2/3">
          <div className="skeleton-shimmer" />
        </div>
        <div className="skeleton h-8 w-1/2">
          <div className="skeleton-shimmer" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`panel group p-5 transition-colors duration-300 ${accentRing[accent]}`}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <p className="text-[0.8125rem] font-medium leading-tight text-ink-muted">
          {label}
        </p>
        {icon && (
          <span
            className={`shrink-0 opacity-60 transition-opacity group-hover:opacity-100 ${accentText[accent]}`}
            aria-hidden="true"
          >
            {icon}
          </span>
        )}
      </div>

      <p className="text-3xl font-semibold tracking-tight text-ink tabular-nums">
        {format(value)}
      </p>

      {sublabel && <p className="mt-1.5 text-xs text-ink-subtle">{sublabel}</p>}
    </div>
  );
}
