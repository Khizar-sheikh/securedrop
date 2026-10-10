import { NextResponse } from 'next/server';
import { API_URL } from '../../../../lib/api';
import {
  clearRefreshCookie,
  isTrustedOrigin,
  readRefreshCookie,
} from '../../../../lib/session-cookie';

/** Clears the refresh cookie and revokes the session on the backend. */
export async function POST(request: Request): Promise<NextResponse> {
  if (!isTrustedOrigin(request.headers.get('origin'))) {
    return NextResponse.json({ error: { code: 'FORBIDDEN' } }, { status: 403 });
  }

  const token = await readRefreshCookie();
  if (token) {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: token }),
      });
    } catch {
      // Backend unreachable — the cookie is cleared either way.
    }
  }
  await clearRefreshCookie();
  return NextResponse.json({ ok: true });
}
