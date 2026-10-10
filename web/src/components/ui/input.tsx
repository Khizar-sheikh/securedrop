'use client';

import { forwardRef, useId, useState } from 'react';

export function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-text">
      {children}
    </label>
  );
}

export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 text-sm text-danger">
      {message}
    </p>
  );
}

const fieldClasses =
  'w-full rounded-md border border-border bg-surface px-3 text-sm text-text placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:bg-surface-variant';

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(
  function Input({ className = '', invalid = false, ...rest }, ref) {
    return (
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={`${fieldClasses} h-11 ${invalid ? 'border-danger' : ''} ${className}`}
        {...rest}
      />
    );
  },
);

/** Password field with a show/hide toggle (accessible name changes with state). */
export const PasswordInput = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }
>(function PasswordInput({ className = '', invalid = false, ...rest }, ref) {
  const [visible, setVisible] = useState(false);
  const id = useId();
  return (
    <div className="relative">
      <input
        ref={ref}
        type={visible ? 'text' : 'password'}
        aria-invalid={invalid || undefined}
        className={`${fieldClasses} h-11 pr-20 ${invalid ? 'border-danger' : ''} ${className}`}
        {...rest}
      />
      <button
        type="button"
        id={id}
        onClick={() => setVisible((v) => !v)}
        className="absolute inset-y-0 right-0 flex items-center px-3 text-sm text-muted hover:text-text focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand"
        aria-label={visible ? 'Hide password' : 'Show password'}
      >
        {visible ? 'Hide' : 'Show'}
      </button>
    </div>
  );
});
