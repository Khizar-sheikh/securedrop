export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-surface px-6 py-12 text-center">
      <svg
        aria-hidden="true"
        viewBox="0 0 48 48"
        fill="none"
        className="h-10 w-10 text-muted"
      >
        <path
          d="M10 14a4 4 0 0 1 4-4h8l4 4h8a4 4 0 0 1 4 4v16a4 4 0 0 1-4 4H14a4 4 0 0 1-4-4V14Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
      <div>
        <p className="text-base font-semibold text-text">{title}</p>
        <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>
      </div>
      {action}
    </div>
  );
}
