import { NextResponse, type NextRequest } from 'next/server';
import { validateRedirect, ALLOWED_REDIRECT_PATHS } from '@/lib/redirectUtils';
import { addSecurityHeadersToResponse } from '@/lib/security-headers';

/**
 * Authentication Middleware
 * Protects routes that require authentication by checking for valid session cookie
 * Also applies security headers to all responses
 */
export function middleware(request: NextRequest) {
  try {
    const { pathname } = request.nextUrl;

    // Get the session cookie (authToken)
    const sessionCookie = request.cookies.get('session');

    // Define public routes that don't require authentication
    const publicRoutePrefixes = ['/login', '/register', '/shop', '/products', '/product-category', '/cart', '/checkout', '/search', '/forgot', '/reset', '/about'];
    const exactPublicRoutes = ['/'];
    
    // Check if the current path is a public route
    const isPublicRoute = 
      exactPublicRoutes.includes(pathname) ||
      publicRoutePrefixes.some(prefix => pathname.startsWith(prefix));

    // Check if the current path is a protected route
    const isProtectedRoute = 
      pathname.startsWith('/my-account') ||
      pathname.startsWith('/dashboard') || 
      pathname.startsWith('/account') ||
      pathname.startsWith('/orders') ||
      pathname.startsWith('/checkout/order-received');

    // If accessing a protected route without authentication
    if (isProtectedRoute && !sessionCookie) {
      // Validate and sanitize the redirect path
      const safeRedirect = validateRedirect(pathname, ALLOWED_REDIRECT_PATHS, '/my-account');
      
      // Create redirect URL with validated 'next' parameter
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('next', safeRedirect);
      
      const response = NextResponse.redirect(loginUrl);
      return addSecurityHeadersToResponse(response);
    }

    // Allow all other requests to proceed with security headers
    const response = NextResponse.next();
    return addSecurityHeadersToResponse(response);
  } catch (error) {
    // Error handling: log error and allow request to proceed to avoid breaking the app
    console.error('[Middleware] Error:', error);
    const response = NextResponse.next();
    return addSecurityHeadersToResponse(response);
  }
}

/**
 * Matcher configuration for middleware
 * Only runs on routes that match the pattern
 */
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
