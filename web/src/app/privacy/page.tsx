import type { Metadata } from 'next';
import { MarketingHeader } from '../../components/site/marketing-header';
import { MarketingFooter } from '../../components/site/marketing-footer';

export const metadata: Metadata = {
  title: 'Privacy',
  description: 'How SecureDrop handles your data.',
};

export default function PrivacyPage() {
  return (
    <>
      <MarketingHeader />
      <main className="mx-auto w-full max-w-2xl px-6 py-14">
        <h1 className="text-3xl font-bold tracking-tight text-text">Privacy</h1>
        <p className="mt-2 text-sm text-muted">Last updated: October 2026</p>

        <div className="prose-sm mt-8 space-y-6 text-sm leading-relaxed text-muted">
          <section>
            <h2 className="text-base font-semibold text-text">What we store</h2>
            <p className="mt-2">
              SecureDrop stores your email address, a salted password hash, the files and notes
              you upload, and metadata about the shares you create (expiry, access counts,
              whether a password is set). Share link tokens are stored only as SHA-256 hashes.
            </p>
          </section>
          <section>
            <h2 className="text-base font-semibold text-text">File storage</h2>
            <p className="mt-2">
              Uploaded files live in private object storage. Nothing is publicly listable or
              directly addressable; file bytes are streamed only after the server authorizes the
              request against the share rules.
            </p>
          </section>
          <section>
            <h2 className="text-base font-semibold text-text">Security logging</h2>
            <p className="mt-2">
              We record security-relevant events (sign-ins, failed attempts, share opens,
              downloads, and revocations), including a best-effort IP address and user agent.
              IP addresses are treated as a risk signal, never as identity. Audit records are
              retained for 180 days by default and then removed automatically.
            </p>
          </section>
          <section>
            <h2 className="text-base font-semibold text-text">What we never do</h2>
            <p className="mt-2">
              We do not sell data, do not run third-party analytics on this application, and do
              not expose raw link tokens, password hashes, or storage credentials through any
              interface.
            </p>
          </section>
          <section>
            <h2 className="text-base font-semibold text-text">Your account</h2>
            <p className="mt-2">
              You can delete your files at any time from your dashboard. Deleting your account or
              a specific deployment concern should be raised with whoever operates your
              SecureDrop instance.
            </p>
          </section>
        </div>
      </main>
      <MarketingFooter />
    </>
  );
}
