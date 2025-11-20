// NextAuth.js configuration
import { NextAuthOptions } from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { prisma } from './utils/db';
import bcrypt from 'bcryptjs';
import type { Adapter } from 'next-auth/adapters';
import { isEmailAllowed } from './utils/allowlist';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as Adapter,
  providers: [
    // Google OAuth (optional - only enabled if credentials are provided)
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            async profile(profile) {
              // Don't throw error here - let signIn callback handle it
              // This allows us to pass the email to the error page
              return {
                id: profile.sub,
                name: profile.name,
                email: profile.email,
                image: profile.picture,
              };
            },
          }),
        ]
      : []),

    // Email/Password authentication
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Invalid credentials');
        }

        // Check if email is on the allowlist BEFORE checking credentials
        if (!isEmailAllowed(credentials.email)) {
          throw new Error('UNAUTHORIZED_EMAIL');
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.password) {
          throw new Error('Invalid credentials');
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          throw new Error('Invalid credentials');
        }

        // Ensure email is a string for NextAuth User type
        if (!user.email) {
          throw new Error('User email not found');
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name || undefined,
          image: user.image || undefined,
        };
      },
    }),
  ],
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error', // NextAuth error page
  },
  events: {
    async signIn({ user }) {
      // Additional check during sign-in event
      if (user.email && !isEmailAllowed(user.email)) {
        throw new Error('UNAUTHORIZED_EMAIL');
      }
    },
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      // Check allowlist on every session request
      if (token.email && !isEmailAllowed(token.email as string)) {
        throw new Error('UNAUTHORIZED_EMAIL');
      }

      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
    async signIn({ user, account }) {
      // Final check before allowing sign-in
      if (user.email && !isEmailAllowed(user.email)) {
        // For OAuth providers, redirect to signin with email in query
        if (account?.provider === 'google') {
          const encodedEmail = encodeURIComponent(user.email);
          return `/auth/signin?error=unauthorized&email=${encodedEmail}`;
        }
        return '/auth/access-denied';
      }
      return true;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
