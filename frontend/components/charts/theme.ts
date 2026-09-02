// Shared Recharts styling so every chart matches.
export const CHART = {
  pulse: '#66c0f4',
  lime: '#a3cf06',
  warn: '#f5a524',
  danger: '#f65e5e',
  violet: '#a78bfa',
  grid: '#1f2b3a',
  axis: '#94a6bd',
  ink: '#f1f5f9',
} as const;

/** Categorical sequence for multi-series charts. */
export const SERIES = [
  CHART.pulse,
  CHART.lime,
  CHART.violet,
  CHART.warn,
  '#4dd4ac',
  '#f472b6',
  '#60a5fa',
  '#fbbf24',
] as const;

export const tooltipStyle = {
  backgroundColor: '#0d141d',
  border: '1px solid #2c3d52',
  borderRadius: '10px',
  padding: '10px 12px',
  boxShadow: '0 8px 24px rgb(0 0 0 / 0.45)',
} as const;

export const tooltipLabelStyle = {
  color: '#f1f5f9',
  fontWeight: 600,
  marginBottom: 4,
} as const;

export const tooltipItemStyle = { color: '#94a6bd' } as const;

export const axisTick = { fill: CHART.axis, fontSize: 12 } as const;

export const cursorFill = { fill: '#ffffff', opacity: 0.04 } as const;

/** Truncate long category labels so vertical bar charts stay readable. */
export const truncate = (value: string, max = 22) =>
  value.length > max ? `${value.slice(0, max - 1)}…` : value;

export const inr = (value: number | null | undefined) =>
  value === null || value === undefined || !Number.isFinite(value)
    ? '—'
    : `₹${value.toLocaleString()}`;

export const compact = (value: number | null | undefined) => {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString();
};
