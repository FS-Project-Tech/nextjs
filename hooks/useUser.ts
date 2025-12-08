"use client";

import { useAuth } from '@/contexts/AuthContext';

/**
 * useUser hook - Simple wrapper around useAuth
 * Provides user data, loading state, and logout function
 * Maintains backward compatibility with existing code
 */
export function useUser() {
  const auth = useAuth();
  
  return {
    user: auth.user,
    loading: auth.isLoading,
    logout: auth.logout,
    refresh: auth.validateSession, // Map validateSession to refresh for compatibility
    isAuthenticated: auth.isAuthenticated,
  };
}

