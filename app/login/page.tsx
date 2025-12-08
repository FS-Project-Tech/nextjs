"use client";

import { useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import LoginForm from '@/components/auth/LoginForm';
import { Shield } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/components/AuthProvider';
import { validateNextParam, ALLOWED_REDIRECT_PATHS } from '@/lib/redirectUtils';

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { user, status } = useAuth();

  const resolveRedirect = useCallback(() => {
    if (!params) return '/dashboard';
    const nextParam = params.get('next');
    // Use secure redirect validation
    return validateNextParam(nextParam, ALLOWED_REDIRECT_PATHS, '/dashboard');
  }, [params]);

  useEffect(() => {
    if (status === 'authenticated' && user) {
      router.replace(resolveRedirect());
    }
  }, [status, user, router, resolveRedirect]);

  if (status === 'authenticated' && user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-gray-600 text-sm">Redirecting to your account…</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex overflow-hidden bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Left side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-4 sm:px-6 lg:px-8 overflow-y-auto">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome
            </h1>
            <p className="text-gray-600">
              Sign in to your account to continue
            </p>
          </div>

          {/* Login Form Card */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
            <LoginForm />
          </div>

          {/* Additional Links */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <Link href="/register" className="font-semibold text-gray-900 hover:text-gray-700 transition-colors">
                Create one now
              </Link>
            </p>
          </div>

          {/* Security Badge */}
          <div className="mt-8 flex items-center justify-center gap-2 text-xs text-gray-500">
            <Shield className="w-4 h-4" />
            <span>Secure login with encrypted connection</span>
          </div>
        </div>
      </div>

      {/* Right side - Dynamic Image */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden h-full">
        <Image
          src="https://images.unsplash.com/photo-1556740758-90de374c12ad?w=800&h=1200&fit=crop&q=80"
          alt="Welcome"
          fill
          priority
          className="object-cover"
          sizes="50vw"
        />
        {/* Overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
        
        {/* Optional: Add some text overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-12 text-white">
          <div className="max-w-md">
            <h2 className="text-3xl font-bold mb-3">
              Secure & Fast Access
            </h2>
            <p className="text-lg text-gray-200 leading-relaxed">
              Sign in to access your account and manage your orders and more
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
