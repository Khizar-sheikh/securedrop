import { cookies } from 'next/headers';

export const REFRESH_COOKIE = 'sd_refresh';
const THIRTY_DAYS_SECONDS = 60 * 60 * 24 * 30;

const isProduction = process.env.NODE_ENV === 'production';

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
  store.set(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    path: '/api/auth',
    maxAge,
  });
}

export async function readRefreshCookie(): Promise<string | null> {
  const store = await cookies();
  return store.get(REFRESH_COOKIE)?.value ?? null;
}

export async function clearRefreshCookie(): Promise<void> {
  const store = await cookies();
  store.delete(REFRESH_COOKIE);
}
