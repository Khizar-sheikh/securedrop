export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 text-text ${className}`}>
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-6 w-6">
        <path
          d="M12 2.5 4.5 5.5v6c0 4.6 3.1 8.4 7.5 10 4.4-1.6 7.5-5.4 7.5-10v-6L12 2.5Z"
          className="fill-brand"
        />
        <path
          d="M9 12.2l2.2 2.2 4.3-4.6"
          stroke="white"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="text-[17px] font-bold tracking-tight">SecureDrop</span>
    </span>
  );
}
