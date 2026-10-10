import Link from 'next/link';
import { MarketingHeader } from '../components/site/marketing-header';
import { MarketingFooter } from '../components/site/marketing-footer';
import { HeroIllustration } from '../components/site/hero-illustration';

const steps = [
  {
    title: 'Upload a file',
    body: 'Drop in the document, archive, or image you need to send.',
    icon: (
      <svg aria-hidden="true" viewBox="0 0 32 32" fill="none" className="h-7 w-7">
        <path d="M6 20v4a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M16 21V7m0 0-5 5m5-5 5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: 'Choose the access rules',
    body: 'Set an expiry, allow or block downloads, limit accesses, or add a password.',
    icon: (
      <svg aria-hidden="true" viewBox="0 0 32 32" fill="none" className="h-7 w-7">
        <path d="M6 10h20M6 16h20M6 22h20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="12" cy="10" r="2.5" className="fill-surface" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="20" cy="16" r="2.5" className="fill-surface" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="14" cy="22" r="2.5" className="fill-surface" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    ),
  },
  {
    title: 'Share the link',
    body: 'Send it anywhere. The backend checks the rules on every open and download.',
    icon: (
      <svg aria-hidden="true" viewBox="0 0 32 32" fill="none" className="h-7 w-7">
        <path d="M13.5 18.5 18.5 13.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M15 11l2-2a4.24 4.24 0 0 1 6 6l-2 2M17 21l-2 2a4.24 4.24 0 0 1-6-6l2-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
];

const controls = [
  {
    label: 'Set an expiry',
    detail: 'Links stop working on their own: one hour, one day, or a custom time.',
  },
  {
    label: 'Allow or prevent downloads',
    detail: 'Recipients can inspect the file details with downloads turned off.',
  },
  {
    label: 'Limit access',
    detail: 'Cap how many times a link can be opened, or make it one-time.',
  },
  {
    label: 'Revoke when you need to',
    detail: 'One action kills the link and ends active recipient sessions.',
  },
  {
    label: 'Review access events',
    detail: 'Opens, downloads, and denials show up in your activity history.',
  },
];

const securityPoints = [
  {
    title: 'Private file storage',
    body: 'Files live in a private bucket. Nothing is served publicly; downloads are streamed through the API after authorization.',
  },
  {
    title: 'Server-side access checks',
    body: 'Every open and download is authorized on the server against the share rules, never trusted to the browser.',
  },
  {
    title: 'Expiring, revocable links',
    body: 'Each share has its own random token. Revoking it invalidates the link and active recipient sessions immediately.',
  },
  {
    title: 'Extra checks when you want them',
    body: 'Optional passwords, one-time links, and stricter recipient-session binding are available per share.',
  },
  {
    title: 'Activity history',
    body: 'Share-relevant events (opens, downloads, denials, revocations) are recorded and visible to the owner.',
  },
];

export default function HomePage() {
  return (
    <>
      <MarketingHeader />
      <main>
        {/* Hero */}
        <section id="product" className="mx-auto w-full max-w-5xl px-6 pb-16 pt-14 md:pb-24 md:pt-20">
          <div className="grid items-center gap-12 md:grid-cols-2">
            <div>
              <h1 className="text-4xl font-bold leading-tight tracking-tight text-text md:text-5xl">
                Share the file.
                <br />
                Keep control.
              </h1>
              <p className="mt-5 max-w-md text-lg leading-relaxed text-muted">
                Send files with links you can manage. Set an expiry, limit access, and revoke a
                share when you need to.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  href="/signup"
                  className="inline-flex h-12 items-center rounded-md bg-brand px-6 text-base font-medium text-white hover:bg-brand/90"
                >
                  Get started
                </Link>
                <a
                  href="#how"
                  className="inline-flex h-12 items-center rounded-md border border-border px-6 text-base font-medium text-text hover:bg-surface-variant"
                >
                  See how it works
                </a>
              </div>
            </div>
            <HeroIllustration />
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="border-y border-border bg-surface/60">
          <div className="mx-auto w-full max-w-5xl px-6 py-16 md:py-20">
            <h2 className="text-2xl font-bold tracking-tight text-text md:text-3xl">
              How sharing works
            </h2>
            <p className="mt-3 max-w-xl text-muted">
              Three steps, and the rules travel with the link.
            </p>
            <ol className="mt-10 grid gap-10 md:grid-cols-3 md:gap-8">
              {steps.map((step, index) => (
                <li key={step.title} className="relative">
                  <div className="flex items-center gap-3 text-brand">
                    <span className="text-xs font-semibold uppercase tracking-wider">
                      Step {index + 1}
                    </span>
                    {step.icon}
                  </div>
                  <h3 className="mt-3 text-lg font-semibold text-text">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{step.body}</p>
                  {index < steps.length - 1 && (
                    <span
                      aria-hidden="true"
                      className="mt-6 hidden h-px w-full bg-border md:block"
                    />
                  )}
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Control after sharing */}
        <section className="mx-auto w-full max-w-5xl px-6 py-16 md:py-24">
          <div className="grid items-start gap-12 md:grid-cols-2">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-text md:text-3xl">
                Control after you hit send
              </h2>
              <p className="mt-4 max-w-md text-muted leading-relaxed">
                A share is a policy, not just a URL. Change your mind later; the backend
                enforces whatever you set.
              </p>
              <dl className="mt-8 space-y-5">
                {controls.map((control) => (
                  <div key={control.label} className="border-l-2 border-brand pl-4">
                    <dt className="text-sm font-semibold text-text">{control.label}</dt>
                    <dd className="mt-1 text-sm text-muted">{control.detail}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* product-style settings mock (decorative) */}
            <div aria-hidden="true" className="rounded-lg border border-border bg-surface p-6 shadow-sm">
              <p className="text-sm font-semibold text-text">Share settings</p>
              <div className="mt-5 space-y-4">
                <div className="flex items-center justify-between rounded-md border border-border bg-background px-4 py-3">
                  <span className="text-sm text-muted">Expires</span>
                  <span className="text-sm font-medium text-text">In 24 hours</span>
                </div>
                <div className="flex items-center justify-between rounded-md border border-border bg-background px-4 py-3">
                  <span className="text-sm text-muted">Downloads</span>
                  <span className="inline-flex items-center gap-2 text-sm font-medium text-text">
                    <span className="flex h-5 w-9 items-center rounded-full bg-brand px-0.5">
                      <span className="ml-auto h-4 w-4 rounded-full bg-white" />
                    </span>
                    Allowed
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-md border border-border bg-background px-4 py-3">
                  <span className="text-sm text-muted">Access limit</span>
                  <span className="text-sm font-medium text-text">3 opens</span>
                </div>
                <div className="flex items-center justify-between rounded-md border border-border bg-background px-4 py-3">
                  <span className="text-sm text-muted">Password</span>
                  <span className="text-sm font-medium text-text">On</span>
                </div>
              </div>
              <div className="mt-5 rounded-md bg-danger-surface px-4 py-3">
                <p className="text-sm font-medium text-danger">Revoke link</p>
              </div>
            </div>
          </div>
        </section>

        {/* Security */}
        <section id="security" className="border-y border-border bg-surface/60">
          <div className="mx-auto grid w-full max-w-5xl gap-10 px-6 py-16 md:grid-cols-[1fr_1.2fr] md:py-20">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-text md:text-3xl">
                Security, explained plainly
              </h2>
              <p className="mt-4 max-w-sm text-muted leading-relaxed">
                No badges, no buzzwords. Here is what actually happens when you share a
                file with SecureDrop.
              </p>
            </div>
            <ul className="space-y-6">
              {securityPoints.map((point) => (
                <li key={point.title}>
                  <h3 className="flex items-center gap-2 text-base font-semibold text-text">
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 16 16"
                      fill="none"
                      className="h-4 w-4 shrink-0 text-brand"
                    >
                      <path
                        d="M3 8.5 6.5 12 13 4.5"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    {point.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{point.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Notes */}
        <section id="notes" className="mx-auto w-full max-w-5xl px-6 py-16 md:py-20">
          <div className="grid items-center gap-10 md:grid-cols-[1.1fr_1fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-brand">
                Also included
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-text">
                Notes and code snippets, next to the files
              </h2>
              <p className="mt-4 max-w-md text-muted leading-relaxed">
                Keep a Markdown note or a code snippet with the documents it belongs to, and
                share either one with the same access rules.
              </p>
            </div>
            <div
              aria-hidden="true"
              className="rounded-lg border border-border bg-surface p-5 font-mono text-[13px] leading-relaxed"
            >
              <p className="font-sans text-xs font-semibold text-muted">deploy-notes.md</p>
              <pre className="mt-3 overflow-x-auto text-text">
                <code>{`## Release checklist
- rotate signing keys
- verify backup restore

\`\`\`bash
curl -fsS $HEALTH_URL
\`\`\``}</code>
              </pre>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="border-t border-border bg-surface/60">
          <div className="mx-auto w-full max-w-5xl px-6 py-16 text-center md:py-20">
            <h2 className="text-2xl font-bold tracking-tight text-text md:text-3xl">
              Start with one file.
            </h2>
            <p className="mx-auto mt-3 max-w-md text-muted">
              Create an account, upload something, and send a link you still control.
            </p>
            <Link
              href="/signup"
              className="mt-8 inline-flex h-12 items-center rounded-md bg-brand px-8 text-base font-medium text-white hover:bg-brand/90"
            >
              Get started
            </Link>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </>
  );
}
