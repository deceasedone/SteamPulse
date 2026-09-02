/** Shown while a Server Component page awaits its BigQuery round trip. */
export default function Loading() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8" aria-busy="true">
      <span className="sr-only">Loading…</span>

      <div className="mb-8 space-y-3">
        <div className="skeleton h-4 w-24"><div className="skeleton-shimmer" /></div>
        <div className="skeleton h-10 w-80 max-w-full"><div className="skeleton-shimmer" /></div>
        <div className="skeleton h-4 w-full max-w-lg"><div className="skeleton-shimmer" /></div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="panel p-5">
            <div className="skeleton mb-4 h-3.5 w-2/3"><div className="skeleton-shimmer" /></div>
            <div className="skeleton h-8 w-1/2"><div className="skeleton-shimmer" /></div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="panel p-6">
            <div className="skeleton mb-5 h-5 w-44"><div className="skeleton-shimmer" /></div>
            <div className="skeleton h-[340px] w-full"><div className="skeleton-shimmer" /></div>
          </div>
        ))}
      </div>
    </main>
  );
}
