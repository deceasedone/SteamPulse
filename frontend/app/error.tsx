'use client';

import { useEffect } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

/** Route-level error boundary: what a warehouse outage looks like. */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center px-4 text-center">
      <AlertTriangle className="mb-5 h-11 w-11 text-danger" aria-hidden="true" />
      <h1 className="mb-2 text-2xl font-semibold text-ink">
        Something went wrong
      </h1>
      <p className="mb-1 text-ink-muted">
        We couldn&apos;t load this data from the warehouse.
      </p>
      <p className="mb-7 max-w-md text-sm text-ink-subtle">
        This usually means BigQuery credentials are missing or the analytics
        tables haven&apos;t been built yet. Check the server logs for details.
      </p>

      {error.digest && (
        <p className="mb-6 font-mono text-xs text-ink-subtle">
          Reference: {error.digest}
        </p>
      )}

      <button
        type="button"
        onClick={reset}
        className="inline-flex items-center gap-2 rounded-lg bg-pulse px-4 py-2 text-sm font-medium text-ground transition-opacity hover:opacity-90"
      >
        <RotateCcw className="h-4 w-4" aria-hidden="true" />
        Try again
      </button>
    </main>
  );
}
