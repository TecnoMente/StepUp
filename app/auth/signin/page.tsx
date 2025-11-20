'use client';

import { signIn, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';
  const authError = searchParams.get('error');
  const emailFromUrl = searchParams.get('email');
  const { data: session, status } = useSession();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAccessDenied, setShowAccessDenied] = useState(false);
  const [deniedEmail, setDeniedEmail] = useState<string | null>(null);

  // Check if user returned from failed OAuth attempt or has error in URL
  useEffect(() => {
    // Check for email in URL parameters (from signIn callback)
    if (emailFromUrl && authError === 'unauthorized') {
      setShowAccessDenied(true);
      setDeniedEmail(decodeURIComponent(emailFromUrl));
      return;
    }

    // Fallback: Check sessionStorage for OAuth attempt
    if (typeof window !== 'undefined') {
      const oauthAttempt = sessionStorage.getItem('oauth-attempt');
      const rejectedEmail = sessionStorage.getItem('oauth-rejected-email');
      const returnedFromOAuth = searchParams.get('callbackUrl');

      // If we attempted OAuth and we're back on signin without a session, it failed
      if (oauthAttempt && returnedFromOAuth && status === 'unauthenticated') {
        sessionStorage.removeItem('oauth-attempt');
        setShowAccessDenied(true);

        // Show the rejected email if we have it
        if (rejectedEmail) {
          setDeniedEmail(rejectedEmail);
          sessionStorage.removeItem('oauth-rejected-email');
        }
      }
    }
  }, [searchParams, status, emailFromUrl, authError]);

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        // Check if error is due to unauthorized email
        if (result.error.includes('UNAUTHORIZED_EMAIL')) {
          router.push('/auth/access-denied');
          return;
        }
        setError('Invalid email or password');
      } else if (result?.url) {
        // Check if redirected to access-denied
        if (result.url.includes('/auth/access-denied')) {
          router.push('/auth/access-denied');
          return;
        }
        router.push(callbackUrl);
        router.refresh();
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    // For OAuth, we need to use full redirect
    // Store a flag to check for errors after callback
    sessionStorage.setItem('oauth-attempt', 'true');
    signIn('google', { callbackUrl });
  };

  const hasGoogleOAuth = process.env.NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED === 'true';

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-serif font-bold text-beige-50">
            Sign in to StepUp
          </h2>
          <p className="mt-2 text-center text-sm text-beige-50/80">
            Or{' '}
            <Link
              href="/auth/signup"
              className="font-medium text-gold-300 hover:text-gold-300/80"
            >
              create a new account
            </Link>
          </p>
        </div>

        <div className="mt-8 card-beige space-y-6">
          {/* Google Sign In - Only show if enabled */}
          {hasGoogleOAuth && (
            <>
              <button
                onClick={handleGoogleSignIn}
                type="button"
                className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-ink-700/20 rounded-lg shadow-sm bg-white text-sm font-medium text-ink-900 hover:bg-gray-50 transition-colors"
              >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-ink-700/20" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-beige-50 text-ink-700">
                Or continue with email
              </span>
            </div>
          </div>
            </>
          )}

          {/* Email/Password Form */}
          <form onSubmit={handleEmailSignIn} className="space-y-6">
            {(authError || showAccessDenied) && (
              <div className="rounded-lg bg-red-100 border border-red-300 p-4">
                <p className="text-sm font-semibold text-red-900 mb-2">Access Denied</p>
                {deniedEmail && (
                  <p className="text-sm text-red-800 mb-2">
                    The email <span className="font-semibold">{deniedEmail}</span> is not authorized to access this application.
                  </p>
                )}
                {!deniedEmail && (
                  <p className="text-sm text-red-800 mb-3">
                    Your email address is not authorized to access this application.
                  </p>
                )}
                <div className="bg-red-50 rounded p-3 border-t border-red-200 mt-3">
                  <p className="text-xs text-red-700 mb-1">For access, contact:</p>
                  <p className="text-sm font-semibold text-red-900">Team Tecnomente</p>
                  <a
                    href="mailto:tecnomente@umich.edu"
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    tecnomente@umich.edu
                  </a>
                </div>
              </div>
            )}

            {error && !authError && !showAccessDenied && (
              <div className="rounded-lg bg-red-100 border border-red-300 p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-ink-900 mb-2"
              >
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full px-4 py-3 border border-ink-700/20 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-800 focus:border-teal-800 bg-white text-ink-900"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-ink-900 mb-2"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full px-4 py-3 border border-ink-700/20 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-800 focus:border-teal-800 bg-white text-ink-900"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-teal-800 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-beige-50">Loading...</p>
        </div>
      </div>
    }>
      <SignInForm />
    </Suspense>
  );
}
