import { NextResponse } from 'next/server';
import { API_URL } from '../../../../lib/api';
import {
  clearRefreshCookie,
  isTrustedOrigin,
  readRefreshCookie,
  setRefreshCookie,
} from '../../../../lib/session-cookie';

interface BackendRefresh {
  success: boolean;
  data?: {
    user: unknown;
    accessToken: string;
    refreshToken: string;
    refreshExpiresIn: number;
  };
  error?: { code: string; message: string };
}

/** Rotates the refresh cookie and returns a fresh access token + user. */
export async function POST(request: Request): Promise<NextResponse> {
  if (!isTrustedOrigin(request.headers.get('origin'))) {
    return NextResponse.json({ error: { code: 'FORBIDDEN' } }, { status: 403 });
  }

  const token = await readRefreshCookie();
  if (!token) {
    return NextResponse.json({ error: { code: 'SESSION_INVALID' } }, { status: 401 });
  }

  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: token }),
  });
  const body = (await res.json().catch(() => null)) as BackendRefresh | null;

  if (!res.ok || !body?.success || !body.data?.accessToken) {
    await clearRefreshCookie();
    return NextResponse.json(
      { error: { code: body?.error?.code ?? 'SESSION_INVALID' } },
      { status: res.status === 401 ? 401 : 502 },
    );
  }

  await setRefreshCookie(body.data.refreshToken, body.data.refreshExpiresIn);
  return NextResponse.json({ accessToken: body.data.accessToken, user: body.data.user });
}
