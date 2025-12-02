'use client';

import { useSession, signOut } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';

export default function Navigation() {
  const { data: session, status } = useSession(); 

  return (
    <nav className="bg-teal-900/50 backdrop-blur-sm border-b border-teal-800">
      <div className="container-custom py-4 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <Image src="/beige_logo.png" alt="StepUp Logo" width={40} height={40} className="rounded-sm" />
          <span className="text-2xl font-serif font-bold text-beige-50">StepUp</span>
        </Link>

        <div className="flex items-center gap-6 text-beige-50">
          {status === 'authenticated' && session?.user && (
            <>
              <Link href="/dashboard" className="hover:text-gold-300 transition-colors font-medium">
                My Resumes
              </Link>
              <div className="flex items-center gap-3">
                <span className="text-sm text-beige-200">
                  {session.user.name || session.user.email}
                </span>
                <button
                  onClick={() => signOut({ callbackUrl: '/' })}
                  className="px-4 py-2 bg-teal-700 hover:bg-teal-600 rounded-md text-sm font-medium transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </>
          )}

          {status === 'unauthenticated' && (
            <>
              <Link href="/auth/signin" className="hover:text-gold-300 transition-colors font-medium">
                Sign In
              </Link>
              <Link
                href="/auth/signup"
                className="px-4 py-2 bg-gold-500 hover:bg-gold-400 text-teal-900 rounded-md font-medium transition-colors"
              >
                Sign Up
              </Link>
            </>
          )}

          {status === 'loading' && (
            <div className="w-20 h-8 bg-teal-800 animate-pulse rounded-md"></div>
          )}
        </div>
      </div>
    </nav>
  );
}
