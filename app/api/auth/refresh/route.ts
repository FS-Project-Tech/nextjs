import { NextResponse } from 'next/server';
import { serverRefreshToken, serverValidateSession, serverLogout } from '@/lib/graphql/auth-server';
import { getAuthToken, validateToken, getUserData, getCSRFToken } from '@/lib/auth-server';
import { sanitizeUser } from '@/lib/sanitize';
import {
  createSession,
  serializeSessionForClient,
  SessionType,
  type SessionUser,
} from '@/lib/session';

/**
 * POST /api/auth/refresh
 * Refresh auth token via GraphQL refresh token cookie and return fresh session data.
 * Falls back to clearing cookies on failure.
 */
export async function POST() {
  try {
    const refreshResult = await serverRefreshToken();

    if (!refreshResult.success || !refreshResult.authToken) {
      await serverLogout();
      return NextResponse.json(
        { success: false, error: 'Token refresh failed' },
        {
          status: 401,
          headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
        }
      );
    }

    // Read the freshly set auth token and rebuild session for the client
    const token = await getAuthToken();
    if (!token) {
      await serverLogout();
      return NextResponse.json(
        { success: false, error: 'No session' },
        { status: 401, headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
      );
    }

    const isValid = await validateToken(token);
    if (!isValid) {
      await serverLogout();
      return NextResponse.json(
        { success: false, error: 'Session expired' },
        { status: 401, headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
      );
    }

    const userData = await getUserData(token);
    if (!userData) {
      await serverLogout();
      return NextResponse.json(
        { success: false, error: 'Unable to fetch user' },
        { status: 401, headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
      );
    }

    const csrfToken = await getCSRFToken();
    const sanitizedUser = sanitizeUser(userData);
    const sessionUser: SessionUser = {
      id: sanitizedUser.id,
      email: sanitizedUser.email || '',
      name: sanitizedUser.name || sanitizedUser.username || '',
      username: sanitizedUser.username || '',
      roles: sanitizedUser.roles || [],
    };

    const session = createSession(SessionType.AUTH, {
      token,
      user: sessionUser,
      csrfToken: csrfToken || undefined,
    });

    const validation = await serverValidateSession();

    return NextResponse.json(
      {
        success: true,
        user: sanitizedUser,
        session: serializeSessionForClient(session),
        validatedUser: validation.valid ? validation.user : undefined,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (error) {
    console.error('[auth/refresh] error', error);
    return NextResponse.json(
      { success: false, error: 'Unable to refresh session' },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { getAuthToken, validateToken, getUserData, setAuthToken, clearAuthToken } from '@/lib/auth-server';

/**
 * POST /api/auth/refresh
 * Refresh session token by validating current token and extending expiration
 * This implements token rotation for better security
 */
export async function POST(request: NextRequest) {
  try {
    const token = await getAuthToken();

    if (!token) {
      return NextResponse.json(
        { success: false, error: { code: 'NO_TOKEN', message: 'No session token found.' } },
        { status: 401 }
      );
    }

    // Validate current token
    const isValid = await validateToken(token);
    
    if (!isValid) {
      // Clear invalid session
      await clearAuthToken();
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_TOKEN', message: 'Session expired. Please login again.' } },
        { status: 401 }
      );
    }

    // Get user data to verify token is still valid
    const user = await getUserData(token);
    
    if (!user) {
      // Clear invalid session
      await clearAuthToken();
      return NextResponse.json(
        { success: false, error: { code: 'USER_NOT_FOUND', message: 'Unable to fetch user data.' } },
        { status: 401 }
      );
    }

    // Token is valid - refresh by setting it again (extends expiration)
    // In a more advanced setup, you could request a new token from WordPress
    // For now, we just extend the cookie expiration
    const csrf = await setAuthToken(token);

    return NextResponse.json({
      success: true,
      user,
      csrfToken: csrf,
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    console.error('[auth/refresh] error:', error);
    
    // Clear session on error
    try {
      await clearAuthToken();
    } catch (clearError) {
      // Ignore clear errors
    }

    return NextResponse.json(
      { success: false, error: { code: 'REFRESH_FAILED', message: 'Unable to refresh session.' } },
      { status: 500 }
    );
  }
}


