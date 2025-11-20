// Next.js middleware for route protection and authentication
import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

// Public routes that don't require authentication
const publicRoutes = [
  '/',
  '/auth/signin',
  '/auth/signup',
  '/auth/error',
  '/auth/access-denied',
  '/api/auth', // NextAuth API routes
];

export default withAuth(
  function middleware(req) {
    // This function runs after authentication check passes
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ req, token }) => {
        const { pathname } = req.nextUrl;

        // Allow public routes without authentication
        if (publicRoutes.some((route) => pathname.startsWith(route))) {
          return true;
        }

        // All other routes require authentication
        return !!token;
      },
    },
    pages: {
      signIn: '/auth/signin',
      error: '/auth/error',
    },
  }
);

// Configure which routes use this middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
