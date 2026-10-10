type Tone = 'error' | 'success' | 'info';

const tones: Record<Tone, string> = {
  error: 'border-danger/40 bg-danger-surface text-danger',
  success: 'border-success/40 bg-success/10 text-success',
  info: 'border-border bg-surface-variant text-text',
};

const labels: Record<Tone, string> = { error: 'Error', success: 'Success', info: 'Note' };

export function Alert({ tone = 'info', children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`rounded-md border px-3 py-2 text-sm ${tones[tone]}`}>
      <span className="sr-only">{labels[tone]}: </span>
      {children}
    </div>
  );
}
