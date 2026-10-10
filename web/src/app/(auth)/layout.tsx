import Link from 'next/link';
import { Wordmark } from '../../components/site/wordmark';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="px-6 pt-6">
        <Link href="/" aria-label="SecureDrop home" className="inline-flex rounded-md">
          <Wordmark />
        </Link>
      </header>
      <main className="flex flex-1 items-center justify-center px-6 py-10">
        <div className="w-full max-w-md">{children}</div>
      </main>
      <footer className="px-6 pb-6 text-center text-xs text-muted">
        <Link href="/" className="hover:text-text">
          ← Back to home
        </Link>
      </footer>
    </div>
  );
}
