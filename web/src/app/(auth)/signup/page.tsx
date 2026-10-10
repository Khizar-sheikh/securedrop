'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../components/auth/auth-provider';
import { Alert } from '../../../components/ui/alert';
import { Button } from '../../../components/ui/button';
import { FieldError, Input, Label, PasswordInput } from '../../../components/ui/input';

export default function SignupPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string; confirm?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;

    const next: typeof fieldErrors = {};
    if (!email.includes('@')) next.email = 'Enter a valid email address.';
    if (password.length < 8) next.password = 'Password must be at least 8 characters.';
    if (confirm !== password) next.confirm = 'Passwords do not match.';
    setFieldErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    setError(null);
    try {
      await register(email.trim().toLowerCase(), password);
      router.replace('/app');
    } catch (err) {
      const message =
        err instanceof Error && err.message !== 'Something went wrong. Please try again.'
          ? err.message
          : 'Could not create the account. Please try again.';
      setError(message);
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-text">Create your account</h1>
      <p className="mt-2 text-sm text-muted">
        One email and a password. Nothing else is required.
      </p>

      <form onSubmit={onSubmit} noValidate className="mt-8 space-y-5">
        {error && <Alert tone="error">{error}</Alert>}

        <div>
          <Label htmlFor="email">Email</Label>
          <div className="mt-1.5">
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              invalid={Boolean(fieldErrors.email)}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <FieldError id="email-error" message={fieldErrors.email} />
        </div>

        <div>
          <Label htmlFor="password">Password</Label>
          <div className="mt-1.5">
            <PasswordInput
              id="password"
              name="password"
              autoComplete="new-password"
              required
              value={password}
              invalid={Boolean(fieldErrors.password)}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
              aria-describedby="password-hint"
            />
          </div>
          <p id="password-hint" className="mt-1.5 text-xs text-muted">
            At least 8 characters.
          </p>
          <FieldError id="password-error" message={fieldErrors.password} />
        </div>

        <div>
          <Label htmlFor="confirm">Confirm password</Label>
          <div className="mt-1.5">
            <PasswordInput
              id="confirm"
              name="confirm"
              autoComplete="new-password"
              required
              value={confirm}
              invalid={Boolean(fieldErrors.confirm)}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirm(e.target.value)}
            />
          </div>
          <FieldError id="confirm-error" message={fieldErrors.confirm} />
        </div>

        <Button type="submit" className="w-full" size="lg" loading={submitting}>
          Create account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-brand hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
