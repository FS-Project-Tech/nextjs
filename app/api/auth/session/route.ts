import { NextRequest, NextResponse } from 'next/server';
import { getAuthToken, validateToken, getUserData, getCSRFToken } from '@/lib/auth-server';
import { secureResponse } from '@/lib/security-headers';
import { sanitizeUser } from '@/lib/sanitize';
import {
  createSession,
  SessionType,
  SessionStatus,
  serializeSessionForClient,
  type SessionData,
  type SessionUser,
} from '@/lib/session';

/**
 * GET /api/auth/session
 * Get current session data for client-side hydration
 * Returns sanitized session without sensitive tokens
 */
export async function GET(req: NextRequest) {
  try {
    const token = await getAuthToken();
    const csrfToken = await getCSRFToken();

    // No session
    if (!token) {
      // Return guest session
      const guestSession = createSession(SessionType.GUEST, {});
      
      return secureResponse({
        authenticated: false,
        session: serializeSessionForClient(guestSession),
      }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      });
    }

    // Validate token
    const isValid = await validateToken(token);
    
    if (!isValid) {
      // Return guest session (let client handle logout)
      const guestSession = createSession(SessionType.GUEST, {});
      
      return secureResponse({
        authenticated: false,
        session: serializeSessionForClient(guestSession),
        sessionExpired: true,
      }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      });
    }

    // Get user data
    const userData = await getUserData(token);
    
    if (!userData) {
      return secureResponse({
        authenticated: false,
        session: null,
        error: 'Unable to fetch user data',
      }, {
        status: 401,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      });
    }

    // Sanitize user data
    const sanitizedUser = sanitizeUser(userData);
    
    // Create session user
    const sessionUser: SessionUser = {
      id: sanitizedUser.id,
      email: sanitizedUser.email || '',
      name: sanitizedUser.name || sanitizedUser.username || '',
      username: sanitizedUser.username || '',
      roles: sanitizedUser.roles || [],
    };

    // Create authenticated session
    const session = createSession(SessionType.AUTH, {
      token, // Will be removed by serializeSessionForClient
      user: sessionUser,
    });

    // Add CSRF token to session
    if (csrfToken) {
      (session as SessionData).csrfToken = csrfToken;
    }

    // Return session without sensitive data
    return secureResponse({
      authenticated: true,
      session: serializeSessionForClient(session),
      user: sanitizedUser,
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    console.error('[auth/session] error:', error);

    return secureResponse({
      authenticated: false,
      session: null,
      error: 'Failed to get session',
    }, {
      status: 500,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  }
}

/**
 * POST /api/auth/session
 * Validate and optionally refresh session
 */
export async function POST(req: NextRequest) {
  try {
    const token = await getAuthToken();

    if (!token) {
      return secureResponse({
        valid: false,
        error: 'No session',
      }, {
        status: 401,
      });
    }

    // Validate token
    const isValid = await validateToken(token);

    return secureResponse({
      valid: isValid,
      status: isValid ? SessionStatus.VALID : SessionStatus.EXPIRED,
    }, {
      status: isValid ? 200 : 401,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    console.error('[auth/session] validation error:', error);

    return secureResponse({
      valid: false,
      error: 'Validation failed',
    }, {
      status: 500,
    });
  }
}

