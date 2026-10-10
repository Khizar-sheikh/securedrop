import type { Metadata } from 'next';
import { MarketingHeader } from '../../components/site/marketing-header';
import { MarketingFooter } from '../../components/site/marketing-footer';

export const metadata: Metadata = {
  title: 'Terms',
  description: 'Terms of use for SecureDrop.',
};

export default function TermsPage() {
  return (
    <>
      <MarketingHeader />
      <main className="mx-auto w-full max-w-2xl px-6 py-14">
        <h1 className="text-3xl font-bold tracking-tight text-text">Terms of use</h1>
        <p className="mt-2 text-sm text-muted">Last updated: October 2026</p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-muted">
          <section>
            <h2 className="text-base font-semibold text-text">Using SecureDrop</h2>
            <p className="mt-2">
              SecureDrop lets you upload files and notes and share them through links with rules
              you set. You are responsible for what you upload and for the links you send. Do not
              use the service for anything unlawful in your jurisdiction.
            </p>
          </section>
          <section>
            <h2 className="text-base font-semibold text-text">Accounts</h2>
            <p className="mt-2">
              Keep your password confidential. Access rules are enforced on the server for every
              request, but anyone who obtains a live link (and password, if you set one) can open
              it until it expires or you revoke it.
            </p>
          </section>
          <section>
            <h2 className="text-base font-semibold text-text">Availability</h2>
            <p className="mt-2">
              SecureDrop is provided as-is, without warranty. Links stop working when they expire,
              reach their access limit, are revoked, or when the underlying file is deleted.
            </p>
          </section>
          <section>
            <h2 className="text-base font-semibold text-text">Changes</h2>
            <p className="mt-2">
              These terms may be updated. Continued use after an update means you accept the new
              terms.
            </p>
          </section>
        </div>
      </main>
      <MarketingFooter />
    </>
  );
}
