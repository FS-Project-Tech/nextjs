import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { getAuthToken, validateToken, getUserData, clearAuthToken } from '@/lib/auth-server';
import { secureResponse } from '@/lib/security-headers';
import { sanitizeUser } from '@/lib/sanitize';

/**
 * GET /api/auth/validate
 * Validate current session and return user data if valid.
 * Tries NextAuth session first (so login via NextAuth survives refresh), then legacy session cookie.
 */
const LOG_VALIDATE = process.env.NODE_ENV === 'development';

export async function GET(req: NextRequest) {
  try {
    // 1) NextAuth session (user logged in via NextAuth with WordPress JWT)
    const nextAuthToken = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });
    const wpToken = (nextAuthToken as any)?.wpToken;

    if (LOG_VALIDATE) {
      console.log('[auth/validate] NextAuth token present:', !!nextAuthToken, 'wpToken present:', !!wpToken);
    }

    if (wpToken) {
      let user = null;
      try {
        user = await getUserData(wpToken);
      } catch (error) {
        const err = error as Error & { code?: string };
        const isTimeoutError =
          err?.name === 'AbortError' ||
          err?.code === 'UND_ERR_CONNECT_TIMEOUT' ||
          err?.message?.includes('timeout') ||
          err?.message?.includes('aborted');
        if (!isTimeoutError) {
          console.error('[auth/validate] getUserData (NextAuth) error:', error);
        }
      }
      if (user) {
        if (LOG_VALIDATE) console.log('[auth/validate] OK (NextAuth) user.id:', user?.id);
        return secureResponse(
          { valid: true, user: sanitizeUser(user) },
          { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
        );
      }
      // Token present but user fetch failed – don’t clear NextAuth session; return 401 so client can retry
      if (LOG_VALIDATE) console.log('[auth/validate] 401 – wpToken present but getUserData failed');
      return secureResponse(
        { valid: false, error: 'Unable to fetch user data' },
        { status: 401 }
      );
    }

    // 2) Legacy session cookie
    const token = await getAuthToken();
    if (LOG_VALIDATE) console.log('[auth/validate] Legacy cookie present:', !!token);
    if (!token) {
      if (LOG_VALIDATE) console.log('[auth/validate] 401 – No session token (NextAuth or legacy)');
      return secureResponse(
        { valid: false, error: 'No session token found' },
        { status: 401 }
      );
    }

    let isValid = false;
    try {
      isValid = await validateToken(token);
    } catch (error) {
      const err = error as Error & { code?: string };
      const isTimeoutError =
        err?.name === 'AbortError' ||
        err?.code === 'UND_ERR_CONNECT_TIMEOUT' ||
        err?.message?.includes('timeout') ||
        err?.message?.includes('aborted');
      if (!isTimeoutError) {
        console.error('Token validation error:', error);
      }
      isValid = false;
    }

    if (!isValid) {
      if (LOG_VALIDATE) console.log('[auth/validate] 401 – Legacy token invalid or expired');
      await clearAuthToken();
      return secureResponse(
        { valid: false, error: 'Invalid or expired session' },
        { status: 401 }
      );
    }

    let user = null;
    try {
      user = await getUserData(token);
    } catch (error) {
      const err = error as Error & { code?: string };
      const isTimeoutError =
        err?.name === 'AbortError' ||
        err?.code === 'UND_ERR_CONNECT_TIMEOUT' ||
        err?.message?.includes('timeout') ||
        err?.message?.includes('aborted');
      if (!isTimeoutError) {
        console.error('Get user data error:', error);
      }
      user = null;
    }

    if (!user) {
      if (LOG_VALIDATE) console.log('[auth/validate] 401 – Legacy: unable to fetch user data');
      await clearAuthToken();
      return secureResponse(
        { valid: false, error: 'Unable to fetch user data' },
        { status: 401 }
      );
    }

    if (LOG_VALIDATE) console.log('[auth/validate] OK (legacy) user.id:', user?.id);
    return secureResponse(
      { valid: true, user: sanitizeUser(user) },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (error) {
    console.error('[auth/validate] error:', error);
    try {
      await clearAuthToken();
    } catch {
      // ignore
    }
    return secureResponse(
      { valid: false, error: 'Session validation failed' },
      { status: 500 }
    );
  }
}


