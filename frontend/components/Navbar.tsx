'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  Activity,
  Building2,
  Flame,
  LayoutDashboard,
  Menu,
  Search,
  X,
} from 'lucide-react';

const navLinks = [
  { href: '/', label: 'Overview', Icon: LayoutDashboard },
  { href: '/explore', label: 'Explore', Icon: Search },
  { href: '/hype', label: 'Hype', Icon: Flame },
  { href: '/publishers', label: 'Publishers', Icon: Building2 },
  { href: '/trends', label: 'Trends', Icon: Activity },
];

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-edge bg-ground/85 backdrop-blur-lg">
      <nav
        aria-label="Primary"
        className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8"
      >
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2.5 rounded-md"
          aria-label="SteamPulse home"
        >
          <span className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-pulse">
            <Activity className="h-4.5 w-4.5 text-ground" strokeWidth={2.5} />
          </span>
          <span className="text-lg font-semibold tracking-tight">
            <span className="text-pulse">Steam</span>
            <span className="text-lime">Pulse</span>
          </span>
        </Link>

        {/* Desktop */}
        <ul className="hidden items-center gap-1 md:flex">
          {navLinks.map(({ href, label, Icon }) => {
            const active = pathname === href;
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? 'bg-pulse/12 text-pulse'
                      : 'text-ink-muted hover:bg-surface-hover hover:text-ink'
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? 'Close menu' : 'Open menu'}
          className="rounded-lg p-2 text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink md:hidden"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {/* Mobile drawer. The old navbar rendered all five links in a flex row
          with no breakpoint, which overflowed below ~640px. */}
      {open && (
        <ul
          id="mobile-nav"
          className="space-y-1 border-t border-edge bg-surface px-4 py-3 md:hidden"
        >
          {navLinks.map(({ href, label, Icon }) => {
            const active = pathname === href;
            return (
              <li key={href}>
                <Link
                  href={href}
                  onClick={() => setOpen(false)}
                  aria-current={active ? 'page' : undefined}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    active
                      ? 'bg-pulse/12 text-pulse'
                      : 'text-ink-muted hover:bg-surface-hover hover:text-ink'
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </header>
  );
}
