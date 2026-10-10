'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Wordmark } from './wordmark';

const links = [
  { href: '#how', label: 'How it works' },
  { href: '#security', label: 'Security' },
  { href: '#notes', label: 'Notes' },
];

export function MarketingHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-6">
        <Link href="/" aria-label="SecureDrop home" className="rounded-md">
          <Wordmark />
        </Link>

        <nav aria-label="Site" className="hidden items-center gap-6 md:flex">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-md text-sm text-muted transition-colors hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Link
            href="/login"
            className="rounded-md px-3 py-2 text-sm font-medium text-text hover:bg-surface-variant"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand/90"
          >
            Get started
          </Link>
        </div>

        <button
          type="button"
          className="rounded-md p-2 text-text hover:bg-surface-variant focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand md:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="sr-only">{open ? 'Close menu' : 'Open menu'}</span>
          <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-5 w-5">
            {open ? (
              <path d="M5 5l10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            ) : (
              <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            )}
          </svg>
        </button>
      </div>

      {open && (
        <nav id="mobile-nav" aria-label="Site" className="border-t border-border px-6 py-4 md:hidden">
          <ul className="flex flex-col gap-1">
            {links.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-md px-2 py-2 text-sm text-text hover:bg-surface-variant"
                >
                  {link.label}
                </a>
              </li>
            ))}
            <li>
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="block rounded-md px-2 py-2 text-sm text-text hover:bg-surface-variant"
              >
                Log in
              </Link>
            </li>
            <li>
              <Link
                href="/signup"
                onClick={() => setOpen(false)}
                className="mt-1 block rounded-md bg-brand px-2 py-2 text-center text-sm font-medium text-white"
              >
                Get started
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
