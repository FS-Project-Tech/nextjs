import { NextRequest, NextResponse } from 'next/server';
import { getAuthToken, validateToken, getUserData, clearAuthToken } from '@/lib/auth-server';
import { secureResponse } from '@/lib/security-headers';
import { sanitizeUser } from '@/lib/sanitize';

/**
 * GET /api/auth/validate
 * Validate current session and return user data if valid
 * Automatically clears invalid sessions
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

    // Validate token with WordPress
    const isValid = await validateToken(token);
    
    if (!isValid) {
      // Clear invalid session
      await clearAuthToken();
      return secureResponse(
        { valid: false, error: 'Invalid or expired session' },
        { status: 401 }
      );
    }

    // Get user data
    const user = await getUserData(token);
    
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


