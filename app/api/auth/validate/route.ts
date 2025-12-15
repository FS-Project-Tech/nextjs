import { NextRequest, NextResponse } from 'next/server';
import { getAuthToken, validateToken, getUserData, clearAuthToken } from '@/lib/auth-server';
import { secureResponse } from '@/lib/security-headers';
import { sanitizeUser } from '@/lib/sanitize';

/**
 * GET /api/auth/validate
 * Validate current session and return user data if valid
 * Automatically clears invalid sessions
 * Includes timeout handling to prevent slow responses
 */
export async function GET(req: NextRequest) {
  try {
    const token = await getAuthToken();

    if (!token) {
      return secureResponse(
        { valid: false, error: 'No session token found' },
        { status: 401 }
      );
    }

    // Validate token with WordPress (with timeout handling)
    let isValid = false;
    try {
      isValid = await validateToken(token);
    } catch (error) {
      // Timeout or connection errors - treat as invalid
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
      // Clear invalid session
      await clearAuthToken();
      return secureResponse(
        { valid: false, error: 'Invalid or expired session' },
        { status: 401 }
      );
    }

    // Get user data (with timeout handling)
    let user = null;
    try {
      user = await getUserData(token);
    } catch (error) {
      // Timeout or connection errors
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
      // Clear invalid session if user data can't be fetched
      await clearAuthToken();
      return secureResponse(
        { valid: false, error: 'Unable to fetch user data' },
        { status: 401 }
      );
    }

    // Sanitize user data before returning
    const sanitizedUser = sanitizeUser(user);

    // Session is valid
    return secureResponse({
      valid: true,
      user: sanitizedUser,
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    console.error('[auth/validate] error:', error);
    
    // Clear session on error
    try {
      await clearAuthToken();
    } catch (clearError) {
      // Ignore clear errors
    }

    return secureResponse(
      { valid: false, error: 'Session validation failed' },
      { status: 500 }
    );
  }
}


