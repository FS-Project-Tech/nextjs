"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  redirectTo: string = '/login'
) {
  return function AuthenticatedComponent(props: P) {
    const { user, status } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (status === 'unauthenticated') {
        const next = typeof window !== 'undefined' ? window.location.pathname : '/';
        router.replace(`${redirectTo}?next=${encodeURIComponent(next)}`);
      }
    }, [status, router, redirectTo]);

    if (status === 'loading') {
      return (
        <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">
          Checking session…
        </div>
      );
    }

    if (status !== 'authenticated') {
      return null;
    }

    return <Component {...props} />;
  };
}

export function useRequireAuth(redirectTo: string = '/login') {
  const { user, status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      const next = typeof window !== 'undefined' ? window.location.pathname : '/';
      router.replace(`${redirectTo}?next=${encodeURIComponent(next)}`);
    }
  }, [status, router, redirectTo]);

  return { user, status };
}

