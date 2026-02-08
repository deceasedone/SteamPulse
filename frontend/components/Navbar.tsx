"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navLinks = [
  { href: '/', label: 'Home', icon: '🏠' },
  { href: '/explore', label: 'Explore', icon: '🔍' },
  { href: '/hype', label: 'Hype', icon: '🔥' },
  { href: '/publishers', label: 'Publishers', icon: '🏢' },
  { href: '/trends', label: 'Trends', icon: '📈' },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="bg-[#171a21] border-b border-[#2a475e] sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo/Brand */}
          <div className="flex-shrink-0">
            <Link href="/" className="flex items-center space-x-2">
              <span className="text-2xl">🎮</span>
              <span className="text-xl font-bold bg-teal-500 bg-clip-text text-transparent">
                Steam Pulse
              </span>
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="flex space-x-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`
                    px-4 py-2 rounded-md text-sm font-medium transition-all duration-200
                    flex items-center space-x-2
                    ${
                      isActive
                        ? 'bg-[#66c0f4] text-[#0b1016]'
                        : 'text-slate-300 hover:bg-[#2a475e] hover:text-white'
                    }
                  `}
                >
                  <span>{link.icon}</span>
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}