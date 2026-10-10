import Link from 'next/link';
import { Wordmark } from './wordmark';

export function MarketingFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-12 md:flex-row md:justify-between">
        <div className="max-w-xs">
          <Wordmark />
          <p className="mt-3 text-sm text-muted">
            Share files with links you can manage: expiring, limitable, and revocable.
          </p>
        </div>
        <nav aria-label="Footer">
          <p className="text-sm font-semibold text-text">Product</p>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li>
              <a href="#how" className="hover:text-text">
                How it works
              </a>
            </li>
            <li>
              <a href="#security" className="hover:text-text">
                Security
              </a>
            </li>
            <li>
              <Link href="/signup" className="hover:text-text">
                Get started
              </Link>
            </li>
          </ul>
        </nav>
        <nav aria-label="Legal">
          <p className="text-sm font-semibold text-text">Legal</p>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li>
              <Link href="/privacy" className="hover:text-text">
                Privacy
              </Link>
            </li>
            <li>
              <Link href="/terms" className="hover:text-text">
                Terms
              </Link>
            </li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-border/60">
        <p className="mx-auto w-full max-w-5xl px-6 py-4 text-xs text-muted">
          © 2026 SecureDrop. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
