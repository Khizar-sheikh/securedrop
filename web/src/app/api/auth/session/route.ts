import { NextResponse } from 'next/server';
import { isTrustedOrigin, setRefreshCookie } from '../../../../lib/session-cookie';

/** Stores the rotating refresh token in an httpOnly cookie (set after login). */
export async function POST(request: Request): Promise<NextResponse> {
  if (!isTrustedOrigin(request.headers.get('origin'))) {
    return NextResponse.json({ error: { code: 'FORBIDDEN' } }, { status: 403 });
  }

  let body: { refreshToken?: unknown; refreshExpiresIn?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: { code: 'BAD_REQUEST' } }, { status: 400 });
  }

  if (
    typeof body.refreshToken !== 'string' ||
    body.refreshToken.length < 16 ||
    body.refreshToken.length > 512
  ) {
    return NextResponse.json({ error: { code: 'BAD_REQUEST' } }, { status: 400 });
  }

  const expiresIn =
    typeof body.refreshExpiresIn === 'number' && body.refreshExpiresIn > 0
      ? body.refreshExpiresIn
      : 60 * 60 * 24 * 30;

  await setRefreshCookie(body.refreshToken, expiresIn);
  return NextResponse.json({ ok: true });
}
