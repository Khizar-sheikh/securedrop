import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ShareView } from '../../../components/share/share-view';
import { Spinner } from '../../../components/ui/spinner';

export const metadata: Metadata = {
  title: 'Open shared file',
  description: 'Open a secure link created with SecureDrop.',
};

async function ShareToken({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <ShareView token={decodeURIComponent(token)} />;
}

export default function SharePage({ params }: { params: Promise<{ token: string }> }) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center">
          <Spinner label="Loading secure link…" />
        </div>
      }
    >
      <ShareToken params={params} />
    </Suspense>
  );
}
