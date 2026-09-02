import type { ReactNode } from 'react';

interface PageHeaderProps {
  /** First half of the heading, rendered in blue. */
  title: string;
  /** Second half, rendered in green. Omit for a single-colour heading. */
  titleAccent?: string;
  description?: string;
  eyebrow?: string;
  action?: ReactNode;
}

export function PageHeader({
  title,
  titleAccent,
  description,
  eyebrow,
  action,
}: PageHeaderProps) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && (
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-pulse">
            {eyebrow}
          </p>
        )}
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          <span className="text-pulse">{title}</span>
          {titleAccent && <span className="text-lime"> {titleAccent}</span>}
        </h1>
        {description && (
          <p className="mt-2 max-w-2xl text-sm text-ink-muted sm:text-base">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

/** "Data as of …" pill shown in page headers. */
export function FreshnessPill({ isoDate }: { isoDate: string }) {
  return (
    <span className="flex w-fit items-center gap-2 rounded-full border border-edge bg-surface px-3 py-1.5 text-xs text-ink-subtle">
      <span className="h-1.5 w-1.5 rounded-full bg-lime" aria-hidden="true" />
      Updated{' '}
      <time dateTime={isoDate}>
        {new Date(isoDate).toLocaleString(undefined, {
          dateStyle: 'medium',
          timeStyle: 'short',
        })}
      </time>
    </span>
  );
}
