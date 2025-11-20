'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense, useEffect } from 'react';
import Link from 'next/link';

function ErrorContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const error = searchParams.get('error');

  // Redirect OAuth errors to signin with email info
  useEffect(() => {
    if (error && (error.includes('OAuth') || error === 'OAuthCallback' || error === 'OAuthCreateAccount')) {
      // Try to extract email from error description if available
      const errorDesc = searchParams.get('error_description') || '';
      const emailMatch = errorDesc.match(/UNAUTHORIZED_EMAIL:([^:]+)/);

      if (emailMatch && emailMatch[1]) {
        const rejectedEmail = decodeURIComponent(emailMatch[1]);
        // Store in sessionStorage and redirect to signin
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('oauth-rejected-email', rejectedEmail);
        }
      }

      router.push('/auth/signin');
    }
  }, [error, router, searchParams]);

  const errorMessages: Record<string, { title: string; message: string; showContact: boolean }> = {
    Configuration: {
      title: 'Configuration Error',
      message: 'There is a problem with the server configuration.',
      showContact: false,
    },
    AccessDenied: {
      title: 'Access Denied',
      message: 'You do not have permission to sign in.',
      showContact: false,
    },
    Verification: {
      title: 'Verification Error',
      message: 'The verification token has expired or has already been used.',
      showContact: false,
    },
    OAuthAccountNotLinked: {
      title: 'Account Error',
      message: 'This email is already associated with another sign-in method.',
      showContact: false,
    },
    OAuthCreateAccount: {
      title: 'Access Denied',
      message: 'Your email address is not authorized to access this application.',
      showContact: true,
    },
    OAuthCallback: {
      title: 'Access Denied',
      message: 'Your email address is not authorized to access this application.',
      showContact: true,
    },
    Default: {
      title: 'Authentication Error',
      message: 'An error occurred during authentication.',
      showContact: false,
    },
  };

  const errorInfo = errorMessages[error || 'Default'] || errorMessages.Default;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-red-100">
            <svg
              className="h-6 w-6 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {errorInfo.title}
          </h2>
          <div className="mt-4 rounded-md bg-red-50 border border-red-200 p-4">
            <p className="text-sm text-red-800">{errorInfo.message}</p>
          </div>

          {errorInfo.showContact && (
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600 mb-4">
                For access, please contact:
              </p>
              <div className="bg-gray-100 rounded-lg p-4">
                <p className="text-lg font-semibold text-gray-900">Team Tecnomente</p>
                <a
                  href="mailto:tecnomente@umich.edu"
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  tecnomente@umich.edu
                </a>
              </div>
            </div>
          )}

          <div className="mt-6 text-center">
            <Link
              href="/auth/signin"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <ErrorContent />
    </Suspense>
  );
}
