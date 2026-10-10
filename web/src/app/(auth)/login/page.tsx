'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../components/auth/auth-provider';
import { Alert } from '../../../components/ui/alert';
import { Button } from '../../../components/ui/button';
import { FieldError, Input, Label, PasswordInput } from '../../../components/ui/input';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;

    const next: typeof fieldErrors = {};
    if (!email.includes('@')) next.email = 'Enter a valid email address.';
    if (!password) next.password = 'Enter your password.';
    setFieldErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    setError(null);
    try {
      await login(email.trim().toLowerCase(), password);
      router.replace('/app');
    } catch (err) {
      setError(
        err instanceof Error && err.message !== 'Something went wrong. Please try again.'
          ? err.message
          : 'Could not sign in. Please try again.',
      );
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-text">Welcome back</h1>
      <p className="mt-2 text-sm text-muted">Sign in to manage your files and shares.</p>

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
              autoComplete="current-password"
              required
              value={password}
              invalid={Boolean(fieldErrors.password)}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
            />
          </div>
          <FieldError id="password-error" message={fieldErrors.password} />
        </div>

        <Button type="submit" className="w-full" size="lg" loading={submitting}>
          Log in
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        New to SecureDrop?{' '}
        <Link href="/signup" className="font-medium text-brand hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
