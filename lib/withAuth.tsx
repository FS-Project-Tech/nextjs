"use client";

import { Component, useEffect, useState, useRef, ReactNode, ErrorInfo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth, type AuthStatus } from '@/contexts/AuthContext';

/**
 * TypeScript interfaces for authentication
 */
export interface User {
  id: number;
  email: string;
  name: string;
  username: string;
  roles: string[];
}

export interface AuthContextData {
  user: User | null;
  status: AuthStatus;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

export interface WithAuthOptions {
  redirectTo?: string;
  requireRoles?: string[];
  fallback?: ReactNode;
  showLoading?: boolean;
}

export interface WithAuthProps {
  user: User;
}

/**
 * Error Boundary Component for Protected Routes
 */
class AuthErrorBoundary extends Component<
  { children: ReactNode; onError?: (error: Error) => void },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode; onError?: (error: Error) => void }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Auth Error Boundary caught an error:', error, errorInfo);
    this.props.onError?.(error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <div className="text-center max-w-md p-6">
            <div className="mb-4">
              <svg
                className="mx-auto h-12 w-12 text-red-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Something went wrong
            </h2>
            <p className="text-gray-600 mb-4">
              {this.state.error?.message || 'An unexpected error occurred. Please try refreshing the page.'}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Loading Spinner Component
 */
function AuthLoadingSpinner({ message = 'Verifying authentication...' }: { message?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-teal-600 border-r-transparent mb-4"></div>
        <p className="text-sm text-gray-600">{message}</p>
      </div>
    </div>
  );
}

/**
 * Higher-Order Component for Protected Routes
 * 
 * @param Component - The component to protect
 * @param options - Configuration options
 * @returns Protected component with authentication check
 * 
 * Features:
 * - Validates authToken existence
 * - Checks token expiration via API
 * - Shows loading spinner during verification
 * - Redirects to login with 'next' parameter
 * - Passes user data to wrapped component
 * - Error boundary for error handling
 * - Role-based access control (optional)
 */
export default function withAuth<P extends object>(
  Component: React.ComponentType<P & WithAuthProps>,
  options: WithAuthOptions = {}
) {
  const {
    redirectTo = '/login',
    requireRoles = [],
    fallback,
    showLoading = true,
  } = options;

  return function AuthenticatedComponent(props: P) {
    const router = useRouter();
    const pathname = usePathname();
    const { user, status, isLoading, validateSession } = useAuth();
    const loading = isLoading;
    const refresh = validateSession;
    const [isVerifying, setIsVerifying] = useState(true);
    const [verificationError, setVerificationError] = useState<string | null>(null);
    const [hasTimedOut, setHasTimedOut] = useState(false);
    const [retryKey, setRetryKey] = useState(0); // Force re-render on retry
    const verificationInProgress = useRef(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    // Verify authentication and token validity
    useEffect(() => {
      // Prevent multiple concurrent verifications
      if (verificationInProgress.current) {
        return;
      }

      const verifyAuth = async () => {
        // Clean up any existing timeout
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }

        verificationInProgress.current = true;
        setIsVerifying(true);
        setVerificationError(null);
        setHasTimedOut(false);

        try {
          // Immediate redirect if already unauthenticated (before any API calls)
          if (status === 'unauthenticated') {
            const currentPath = pathname || window.location.pathname;
            const redirectUrl = `${redirectTo}?next=${encodeURIComponent(currentPath)}`;
            router.replace(redirectUrl);
            return;
          }

          // Wait for auth context to initialize (but with timeout)
          if (status === 'loading') {
            // Set a timeout for the loading state
            timeoutRef.current = setTimeout(() => {
              setHasTimedOut(true);
              setIsVerifying(false);
              setVerificationError('Page took too long to load. Please try again.');
              verificationInProgress.current = false;
            }, 5000);
            // Don't return - let the effect re-run when status changes
            // The cleanup will handle the timeout
            verificationInProgress.current = false;
            return;
          }

          // Check if user is authenticated
          if (!user) {
            const currentPath = pathname || window.location.pathname;
            const redirectUrl = `${redirectTo}?next=${encodeURIComponent(currentPath)}`;
            router.replace(redirectUrl);
            return;
          }

          // Verify token is still valid by calling the API with timeout
          const controller = new AbortController();
          abortControllerRef.current = controller;

          // Set 5-second timeout
          timeoutRef.current = setTimeout(() => {
            controller.abort();
            setHasTimedOut(true);
            setIsVerifying(false);
            setVerificationError('Page took too long to load. Please try again.');
            verificationInProgress.current = false;
          }, 5000);

          try {
            const response = await fetch('/api/auth/me', {
              method: 'GET',
              credentials: 'include',
              cache: 'no-store',
              signal: controller.signal,
            });

            // Clear timeout on successful response
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
              timeoutRef.current = null;
            }

            if (!response.ok) {
              // Token is invalid or expired
              const currentPath = pathname || window.location.pathname;
              const redirectUrl = `${redirectTo}?next=${encodeURIComponent(currentPath)}`;
              router.replace(redirectUrl);
              return;
            }

            const data = await response.json();
            
            // Check if user data is valid
            if (!data?.user) {
              const currentPath = pathname || window.location.pathname;
              const redirectUrl = `${redirectTo}?next=${encodeURIComponent(currentPath)}`;
              router.replace(redirectUrl);
              return;
            }

            // Check role-based access if required
            if (requireRoles.length > 0 && data.user.roles) {
              const hasRequiredRole = requireRoles.some((role) =>
                data.user.roles.includes(role)
              );

              if (!hasRequiredRole) {
                setVerificationError('You do not have permission to access this page.');
                router.replace('/');
                return;
              }
            }

            // All checks passed
            setIsVerifying(false);
            verificationInProgress.current = false;
          } catch (error: any) {
            // Clear timeout on error
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
              timeoutRef.current = null;
            }

            // Handle abort (timeout)
            if (error.name === 'AbortError' || controller.signal.aborted) {
              setHasTimedOut(true);
              setVerificationError('Page took too long to load. Please try again.');
              setIsVerifying(false);
              verificationInProgress.current = false;
              return;
            }

            console.error('Token verification error:', error);
            // Network error or other issue - redirect to login
            const currentPath = pathname || window.location.pathname;
            const redirectUrl = `${redirectTo}?next=${encodeURIComponent(currentPath)}`;
            router.replace(redirectUrl);
          }
        } catch (error: any) {
          console.error('Auth verification error:', error);
          setVerificationError(error.message || 'Authentication verification failed');
          setIsVerifying(false);
          verificationInProgress.current = false;
        }
      };

      verifyAuth();

      // Cleanup function
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        verificationInProgress.current = false;
      };
    }, [user, status, router, pathname, redirectTo, requireRoles, retryKey]);

    // Show timeout error state with retry
    if (hasTimedOut || (verificationError && hasTimedOut)) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <div className="text-center max-w-md p-6">
            <div className="mb-4">
              <svg
                className="mx-auto h-12 w-12 text-yellow-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Page Took Too Long to Load
            </h2>
            <p className="text-gray-600 mb-6">
              {verificationError || 'The page took longer than expected to load. Please try again.'}
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={async () => {
                  // Reset all state
                  setHasTimedOut(false);
                  setVerificationError(null);
                  verificationInProgress.current = false;
                  setIsVerifying(true);
                  
                  // Refresh auth context
                  try {
                    await refresh();
                  } catch (error) {
                    console.error('Failed to refresh auth:', error);
                  }
                  
                  // Force re-render by updating retryKey to trigger useEffect
                  setRetryKey(prev => prev + 1);
                }}
                className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={() => {
                  const currentPath = pathname || window.location.pathname;
                  const redirectUrl = `${redirectTo}?next=${encodeURIComponent(currentPath)}`;
                  router.replace(redirectUrl);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
              >
                Go to Login
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Show loading state (with timeout protection)
    if (loading || isVerifying || status === 'loading') {
      if (fallback) {
        return <>{fallback}</>;
      }
      if (showLoading) {
        return <AuthLoadingSpinner message="Verifying authentication..." />;
      }
      return null;
    }

    // Show other error states
    if (verificationError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <div className="text-center max-w-md p-6">
            <div className="mb-4">
              <svg
                className="mx-auto h-12 w-12 text-red-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Authentication Error
            </h2>
            <p className="text-gray-600 mb-6">{verificationError}</p>
            <button
              onClick={() => {
                const currentPath = pathname || window.location.pathname;
                const redirectUrl = `${redirectTo}?next=${encodeURIComponent(currentPath)}`;
                router.replace(redirectUrl);
              }}
              className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 transition-colors"
            >
              Go to Login
            </button>
          </div>
        </div>
      );
    }

    // Check authentication status
    if (status === 'unauthenticated' || !user) {
      return null; // Will redirect in useEffect
    }

    // Render protected component with user prop
    return (
      <AuthErrorBoundary>
        <Component {...(props as P)} user={user} />
      </AuthErrorBoundary>
    );
  };
}

/**
 * Hook for protected pages (alternative to HOC)
 * Returns user data and handles redirects
 */
export function useProtectedPage(options: WithAuthOptions = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, status, isLoading, validateSession } = useAuth();
  const loading = isLoading;
  const refresh = validateSession;
  const [isVerifying, setIsVerifying] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { redirectTo = '/login', requireRoles = [] } = options;

  useEffect(() => {
    const verify = async () => {
      if (status === 'loading') return;

      if (status === 'unauthenticated' || !user) {
        const currentPath = pathname || window.location.pathname;
        router.replace(`${redirectTo}?next=${encodeURIComponent(currentPath)}`);
        return;
      }

      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include',
          cache: 'no-store',
        });

        if (!response.ok) {
          const currentPath = pathname || window.location.pathname;
          router.replace(`${redirectTo}?next=${encodeURIComponent(currentPath)}`);
          return;
        }

        const data = await response.json();
        if (!data?.user) {
          const currentPath = pathname || window.location.pathname;
          router.replace(`${redirectTo}?next=${encodeURIComponent(currentPath)}`);
          return;
        }

        if (requireRoles.length > 0 && data.user.roles) {
          const hasRole = requireRoles.some((role) => data.user.roles.includes(role));
          if (!hasRole) {
            setError('Insufficient permissions');
            router.replace('/');
            return;
          }
        }

        setIsVerifying(false);
      } catch (err: any) {
        console.error('Verification error:', err);
        await refresh();
        // After refresh, redirect if still unauthenticated
        // We can't read status here due to React rules, so just redirect on error
        const currentPath = pathname || window.location.pathname;
        router.replace(`${redirectTo}?next=${encodeURIComponent(currentPath)}`);
      } finally {
        setIsVerifying(false);
      }
    };

    verify();
  }, [user, status, loading, router, pathname, redirectTo, requireRoles, refresh]);

  return {
    user,
    loading: loading || isVerifying,
    error,
    isAuthenticated: status === 'authenticated' && !!user && !isVerifying,
  };
}

