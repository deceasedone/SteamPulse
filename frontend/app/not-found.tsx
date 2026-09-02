import Link from 'next/link';
import { Compass } from 'lucide-react';

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center px-4 text-center">
      <Compass className="mb-5 h-11 w-11 text-pulse" aria-hidden="true" />
      <p className="mb-2 font-mono text-sm text-ink-subtle">404</p>
      <h1 className="mb-2 text-2xl font-semibold text-ink">Page not found</h1>
      <p className="mb-7 text-ink-muted">
        That route doesn&apos;t exist in SteamPulse.
      </p>
      <Link
        href="/"
        className="rounded-lg bg-pulse px-4 py-2 text-sm font-medium text-ground transition-opacity hover:opacity-90"
      >
        Back to dashboard
      </Link>
    </main>
  );
}
