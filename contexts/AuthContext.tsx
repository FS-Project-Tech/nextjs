"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';

/**
 * User interface
 */
export interface User {
  id: number;
  email: string;
  name: string;
  username: string;
  roles: string[];
  customer?: any | null;
}

/**
 * Auth error types
 */
export type AuthError = {
  code: string;
  message: string;
} | null;

/**
 * Auth status types
 */
export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'error';

/**
 * Auth Context Type
 */
export interface AuthContextType {
  // State
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  status: AuthStatus;
  error: AuthError;
  
  // Actions
  login: (username: string, password: string, redirectTo?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  validateSession: () => Promise<void>;
  refreshSession: () => Promise<void>;
  clearError: () => void;
}

/**
 * Create Auth Context
 */
const AuthContext = createContext<AuthContextType | null>(null);

/**
 * Storage key for cross-tab synchronization
 */
const AUTH_SYNC_KEY = 'auth-sync';
const SESSION_CHECK_INTERVAL = 5 * 60 * 1000; // Check session every 5 minutes
const TOKEN_REFRESH_THRESHOLD = 10 * 60 * 1000; // Refresh if less than 10 minutes remaining

/**
 * AuthProvider Component
 * Manages global authentication state with cross-tab synchronization
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [error, setError] = useState<AuthError>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const sessionCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializedRef = useRef(false);

  /**
   * Clear all intervals
   */
  const clearIntervals = useCallback(() => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }
    if (sessionCheckIntervalRef.current) {
      clearInterval(sessionCheckIntervalRef.current);
      sessionCheckIntervalRef.current = null;
    }
  }, []);

  /**
   * Broadcast auth state change to other tabs
   * Uses localStorage ONLY for cross-tab synchronization (not for storing tokens)
   * Tokens are stored in HttpOnly cookies, not localStorage
   */
  const broadcastAuthChange = useCallback((action: 'login' | 'logout' | 'refresh', data?: any) => {
    if (typeof window === 'undefined') return;
    
    try {
      // Only store sync metadata, NEVER store tokens or sensitive data
      const syncData = {
        action,
        // Only store non-sensitive metadata (user ID, timestamp)
        userId: data?.user?.id || null,
        timestamp: Date.now(),
      };
      
      const event = new CustomEvent('storage', {
        detail: {
          key: AUTH_SYNC_KEY,
          action,
          data: syncData,
          timestamp: Date.now(),
        },
      });
      // Store only sync metadata, NOT tokens or sensitive user data
      window.localStorage.setItem(AUTH_SYNC_KEY, JSON.stringify(syncData));
      window.dispatchEvent(event);
    } catch (err) {
      // Ignore localStorage errors (private browsing, etc.)
    }
  }, []);

  /**
   * Validate current session
   */
  const validateSession = useCallback(async () => {
    try {
      setStatus('loading');
      setError(null);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      try {
        const response = await fetch('/api/auth/validate', {
          cache: 'no-store',
          credentials: 'include',
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          // Session is invalid
          setUser(null);
          setStatus('unauthenticated');
          broadcastAuthChange('logout');
          return;
        }

        const data = await response.json();

        if (data?.valid && data?.user) {
          setUser(data.user);
          setStatus('authenticated');
          setError(null);
          broadcastAuthChange('refresh', { user: data.user });
        } else {
          setUser(null);
          setStatus('unauthenticated');
          broadcastAuthChange('logout');
        }
      } catch (fetchError: any) {
        clearTimeout(timeoutId);

        if (fetchError.name === 'AbortError' || controller.signal.aborted) {
          setUser(null);
          setStatus('unauthenticated');
          return;
        }

        throw fetchError;
      }
    } catch (err: any) {
      const message = err?.message || '';
      const isNetworkIssue = message.includes('NetworkError') || message.includes('Failed to fetch');

      if (!isNetworkIssue) {
        console.error('Session validation error:', message);
        setError({
          code: 'VALIDATION_ERROR',
          message: 'Failed to validate session. Please try again.',
        });
        setStatus('error');
      } else {
        setUser(null);
        setStatus('unauthenticated');
      }
    }
  }, [broadcastAuthChange]);

  /**
   * Refresh session token
   */
  const refreshSession = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
        cache: 'no-store',
      });

      if (!response.ok) {
        // Refresh failed - session expired
        setUser(null);
        setStatus('unauthenticated');
        broadcastAuthChange('logout');
        return;
      }

      const data = await response.json();

      if (data?.success && data?.user) {
        setUser(data.user);
        setStatus('authenticated');
        setError(null);
        broadcastAuthChange('refresh', { user: data.user });
      } else {
        setUser(null);
        setStatus('unauthenticated');
        broadcastAuthChange('logout');
      }
    } catch (err: any) {
      console.error('Session refresh error:', err);
      setUser(null);
      setStatus('unauthenticated');
      broadcastAuthChange('logout');
    }
  }, [broadcastAuthChange]);

  /**
   * Login function
   */
  const login = useCallback(
    async (
      username: string,
      password: string,
      redirectTo?: string
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        setStatus('loading');
        setError(null);

        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ username, password }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          const errorMessage = data?.error?.message || 'Login failed. Please check your credentials.';
          setError({
            code: data?.error?.code || 'LOGIN_FAILED',
            message: errorMessage,
          });
          setStatus('error');
          return { success: false, error: errorMessage };
        }

        // Login successful
        if (data.user) {
          setUser(data.user);
          setStatus('authenticated');
          setError(null);
          broadcastAuthChange('login', { user: data.user });

          // Redirect if provided
          if (redirectTo) {
            router.push(redirectTo);
          } else if (data.redirectTo) {
            router.push(data.redirectTo);
          } else {
            router.push('/dashboard');
          }
        }

        return { success: true };
      } catch (err: any) {
        const errorMessage = err?.message || 'An error occurred during login. Please try again.';
        setError({
          code: 'LOGIN_ERROR',
          message: errorMessage,
        });
        setStatus('error');
        return { success: false, error: errorMessage };
      }
    },
    [router, broadcastAuthChange]
  );

  /**
   * Logout function
   */
  const logout = useCallback(async () => {
    try {
      setStatus('loading');

      // Call logout API
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      }).catch(() => {
        // Ignore errors - still clear local state
      });

      // Clear local state
      setUser(null);
      setStatus('unauthenticated');
      setError(null);
      clearIntervals();
      broadcastAuthChange('logout');

      // Redirect to login
      router.push('/login');
    } catch (err: any) {
      console.error('Logout error:', err);
      // Still clear state even if API call fails
      setUser(null);
      setStatus('unauthenticated');
      setError(null);
      clearIntervals();
      broadcastAuthChange('logout');
      router.push('/login');
    }
  }, [router, clearIntervals, broadcastAuthChange]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
    if (status === 'error') {
      setStatus('unauthenticated');
    }
  }, [status]);

  /**
   * Setup session refresh interval
   */
  useEffect(() => {
    if (status === 'authenticated' && user) {
      // Clear existing interval
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }

      // Set up periodic session refresh (every 50 minutes, before 1-hour expiration)
      refreshIntervalRef.current = setInterval(() => {
        refreshSession();
      }, 50 * 60 * 1000); // 50 minutes

      // Set up periodic session validation (every 5 minutes)
      if (sessionCheckIntervalRef.current) {
        clearInterval(sessionCheckIntervalRef.current);
      }

      sessionCheckIntervalRef.current = setInterval(() => {
        validateSession();
      }, SESSION_CHECK_INTERVAL);
    } else {
      clearIntervals();
    }

    return () => {
      clearIntervals();
    };
  }, [status, user, refreshSession, validateSession, clearIntervals]);

  /**
   * Listen for cross-tab auth changes
   */
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStorageChange = (e: StorageEvent) => {
      try {
        if (e.key === AUTH_SYNC_KEY && e.newValue) {
          const data = JSON.parse(e.newValue);

          if (data?.action === 'logout') {
            // Another tab logged out
            setUser(null);
            setStatus('unauthenticated');
            clearIntervals();
          } else if (data?.action === 'login' || data?.action === 'refresh') {
            // Another tab logged in or refreshed
            if (data?.data?.user) {
              setUser(data.data.user);
              setStatus('authenticated');
              setError(null);
            }
          }
        }
      } catch (err) {
        // Ignore parsing errors
      }
    };

    // Listen for storage events (cross-tab synchronization)
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [clearIntervals]);

  /**
   * Initialize session on app load
   */
  useEffect(() => {
    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      validateSession();
    }
  }, [validateSession]);

  /**
   * Handle token expiration
   */
  useEffect(() => {
    if (status === 'authenticated' && user) {
      // Check if we need to refresh soon
      const checkTokenExpiration = () => {
        // Since we can't decode JWT on client, we rely on server validation
        // The refresh interval handles this, but we also check on focus
        if (document.hasFocus()) {
          validateSession();
        }
      };

      // Check on window focus
      window.addEventListener('focus', checkTokenExpiration);

      return () => {
        window.removeEventListener('focus', checkTokenExpiration);
      };
    }
  }, [status, user, validateSession]);

  const value: AuthContextType = {
    user,
    isAuthenticated: status === 'authenticated' && !!user,
    isLoading: status === 'loading',
    status,
    error,
    login,
    logout,
    validateSession,
    refreshSession,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * useAuth Hook
 * Access authentication state and functions
 * 
 * @example
 * const { user, isAuthenticated, login, logout } = useAuth();
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

