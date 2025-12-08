"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

export default function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const nextParam = params.get("next") || "/account";
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setLoading(true);

    try {
      const formData = new FormData(event.currentTarget);
      const payload = {
        firstName: String(formData.get("firstName")).trim(),
        lastName: String(formData.get("lastName")).trim(),
        email: String(formData.get("email")).trim(),
        password: String(formData.get("password")),
        confirmPassword: String(formData.get("confirmPassword")),
      };

      if (payload.password !== payload.confirmPassword) {
        throw new Error("Passwords do not match.");
      }

      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result?.error?.message || "Unable to register.");
      }

      router.replace(result.redirectTo || `/login?next=${encodeURIComponent(nextParam)}`);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white/90 p-8 shadow-lg">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-slate-900">Create your account</h1>
        <p className="text-sm text-slate-500">
          Already registered?{" "}
          <Link
            href={`/login?next=${encodeURIComponent(nextParam)}`}
            className="text-teal-600 font-medium hover:underline"
          >
            Sign in
          </Link>
        </p>
      </header>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4" aria-live="polite">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-slate-700">
            First name
            <input
              name="firstName"
              required
              autoComplete="given-name"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/40"
            />
          </label>

          <label className="text-sm font-medium text-slate-700">
            Last name
            <input
              name="lastName"
              required
              autoComplete="family-name"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/40"
            />
          </label>
        </div>

        <label className="text-sm font-medium text-slate-700">
          Email address
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/40"
          />
        </label>

        <label className="text-sm font-medium text-slate-700">
          Password
          <input
            type="password"
            name="password"
            required
            autoComplete="new-password"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/40"
          />
        </label>

        <label className="text-sm font-medium text-slate-700">
          Confirm password
          <input
            type="password"
            name="confirmPassword"
            required
            autoComplete="new-password"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/40"
          />
        </label>

        {formError && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {formError}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center rounded-md bg-teal-600 px-4 py-2 font-medium text-white shadow hover:bg-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? "Creating account…" : "Create account"}
        </button>

        <p className="text-xs text-slate-400">
          By creating an account you agree to our{" "}
          <Link href="/legal/terms" className="text-teal-500 hover:underline">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/legal/privacy" className="text-teal-500 hover:underline">
            Privacy Policy
          </Link>
          .
        </p>
      </form>
    </div>
  );
}

