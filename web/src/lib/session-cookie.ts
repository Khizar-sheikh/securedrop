import { cookies } from 'next/headers';

export const REFRESH_COOKIE = 'sd_refresh';
/** Production uses the __Host- prefix: Secure, Path=/, no Domain attribute. */
export const REFRESH_COOKIE_HOST = '__Host-sd_refresh';
const THIRTY_DAYS_SECONDS = 60 * 60 * 24 * 30;

const isProduction = process.env.NODE_ENV === 'production';

const cookieName = (): string => (isProduction ? REFRESH_COOKIE_HOST : REFRESH_COOKIE);
const cookiePath = (): string => (isProduction ? '/' : '/api/auth');

export const trustedSiteOrigin = (): string =>
  process.env.SITE_ORIGIN ?? 'http://localhost:3001';

/** SameSite=Lax + strict Origin check on every handler = CSRF protection for
 * these state-setting routes; no CORS is exposed on them. */
export const isTrustedOrigin = (origin: string | null): boolean =>
  origin === trustedSiteOrigin();

export async function setRefreshCookie(
  refreshToken: string,
  refreshExpiresIn: number,
): Promise<void> {
  const store = await cookies();
  const maxAge =
    Number.isFinite(refreshExpiresIn) && refreshExpiresIn > 0
      ? Math.min(Math.floor(refreshExpiresIn), THIRTY_DAYS_SECONDS)
      : THIRTY_DAYS_SECONDS;
  store.set(cookieName(), refreshToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    path: cookiePath(),
    maxAge,
  });
}

export async function readRefreshCookie(): Promise<string | null> {
  const store = await cookies();
  // Accept both names so sessions survive an environment-name switch.
  return store.get(REFRESH_COOKIE_HOST)?.value ?? store.get(REFRESH_COOKIE)?.value ?? null;
}

export async function clearRefreshCookie(): Promise<void> {
  const store = await cookies();
  // Expire both names with the path each one was set with, so nothing lingers
  // after an environment switch.
  const options = (path: string) =>
    ({ httpOnly: true, sameSite: 'lax', secure: isProduction, path, maxAge: 0 }) as const;
  store.set(REFRESH_COOKIE_HOST, '', options('/'));
  store.set(REFRESH_COOKIE, '', options('/api/auth'));
}
