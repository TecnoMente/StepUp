# Authentication Setup Guide

This guide explains how to deploy StepUp with user authentication enabled.

## Overview

Your app now has full user authentication with:
- Email/password sign up and login
- Google OAuth ("Sign in with Google")
- User dashboard to access resumes from any device
- Protected routes (must be logged in)
- Session ownership (users only see their own resumes)

## Required Environment Variables

You need to add **3 new environment variables** to Vercel:

### 1. NEXTAUTH_SECRET (Required)
```
NEXTAUTH_SECRET=Vg4Rbc9nhftlsA7tMKicKmeDUIxVlOiNLT4IRn57Rqs=
```

### 2. NEXTAUTH_URL (Required)
```
# For production (replace with your actual Vercel URL):
NEXTAUTH_URL=https://your-app.vercel.app

# For preview deployments, Vercel auto-sets this
```

### 3. Google OAuth Credentials (Optional but Recommended)

To enable "Sign in with Google":

#### Step 1: Create Google OAuth App
1. Go to https://console.cloud.google.com/
2. Create a new project (or select existing)
3. Go to "APIs & Services" → "Credentials"
4. Click "Create Credentials" → "OAuth 2.0 Client ID"
5. Application type: "Web application"
6. Name: "StepUp"
7. Authorized redirect URIs:
   ```
   https://your-app.vercel.app/api/auth/callback/google
   http://localhost:3000/api/auth/callback/google (for local testing)
   ```
8. Click "Create"
9. Copy the "Client ID" and "Client Secret"

#### Step 2: Add to Vercel
```
GOOGLE_CLIENT_ID=your-google-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret-here
```

## Deployment Steps

### 1. Add Environment Variables to Vercel

Go to Vercel Dashboard → Your Project → Settings → Environment Variables

Add these **3 required variables**:

| Variable Name | Value | Environment |
|--------------|-------|-------------|
| `NEXTAUTH_SECRET` | `Vg4Rbc9nhftlsA7tMKicKmeDUIxVlOiNLT4IRn57Rqs=` | Production, Preview, Development |
| `NEXTAUTH_URL` | `https://your-app.vercel.app` | Production only |
| `GOOGLE_CLIENT_ID` | Your Google Client ID | Production, Preview, Development |
| `GOOGLE_CLIENT_SECRET` | Your Google Client Secret | Production, Preview, Development |

**Note**: For preview deployments, Vercel automatically sets `NEXTAUTH_URL` to the preview URL.

### 2. Update Database Schema

Since we added new models (User, Account, etc.), you need to push the schema to your Neon database:

**Option A: Using Vercel CLI (Recommended)**
```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Link project
vercel link

# Run migration
vercel env pull .env.production
npx prisma db push
```

**Option B: Trigger Redeploy**

Just redeploy on Vercel - the `postinstall` script will run `prisma generate` automatically.

### 3. Deploy/Redeploy

1. Merge your PR or push to main
2. Vercel will automatically deploy
3. Or manually trigger a redeploy in Vercel Dashboard

### 4. Test Authentication

1. Visit your deployed app: `https://your-app.vercel.app`
2. Click "Sign Up"
3. Create an account (email/password or Google)
4. Try generating a resume
5. Check the dashboard at `/dashboard`
6. Sign out and sign back in from a different browser/device
7. Verify you can still see your resumes

## How It Works

### User Flow

1. **Unauthenticated user visits `/`**
   - Redirected to `/auth/signin`
   - Can choose email/password or Google OAuth

2. **User signs up**
   - Email/password: Stored in database with hashed password
   - Google: User info stored, no password needed

3. **User creates resume**
   - Session is created and linked to their user ID
   - Saved in database with `userId` foreign key

4. **User views dashboard**
   - Shows all sessions belonging to that user
   - Can access from any device after logging in

5. **User signs out**
   - Session token invalidated
   - Redirected to sign in page

### Database Schema

```prisma
model User {
  id            String        @id @default(cuid())
  email         String?       @unique
  password      String?       // Hashed with bcrypt
  name          String?
  image         String?
  accounts      Account[]     // OAuth accounts (Google, etc.)
  sessions      AuthSession[] // NextAuth sessions
  appSessions   Session[]     // Resume generation sessions
}

model Session {
  id        String   @id
  userId    String?  // Links to User
  user      User?    @relation(fields: [userId], references: [id])
  // ... resume/cover letter data
}
```

## Security Features

### Password Security
- Passwords hashed with bcrypt (12 rounds)
- Never stored in plaintext
- Minimum 8 characters required

### Session Security
- JWT tokens (signed with NEXTAUTH_SECRET)
- 30-day expiration
- HTTP-only cookies
- Automatic CSRF protection

### API Protection
- All generation endpoints require authentication
- Session ownership validated (users can't access others' sessions)
- Rate limiting still in effect (10 resumes/hour per IP)

## Troubleshooting

### Error: "Configuration" on sign in page

**Problem**: `NEXTAUTH_SECRET` not set or `NEXTAUTH_URL` incorrect

**Solution**:
```bash
# Check environment variables in Vercel Dashboard
# Make sure NEXTAUTH_SECRET is set for all environments
# Make sure NEXTAUTH_URL matches your deployment URL
```

### Google OAuth not working

**Problem**: Invalid redirect URI

**Solution**:
1. Go to Google Cloud Console
2. Update Authorized redirect URIs to match your Vercel URL:
   ```
   https://your-actual-vercel-url.vercel.app/api/auth/callback/google
   ```
3. Wait 5 minutes for changes to propagate
4. Try again

### "Unauthorized" error when creating resume

**Problem**: User not properly authenticated

**Solution**:
1. Sign out completely
2. Clear browser cookies
3. Sign in again
4. Try creating resume

### Database connection issues

**Problem**: Prisma can't connect to database

**Solution**:
```bash
# Verify DATABASE_URL is correct in Vercel
# Make sure it ends with ?sslmode=require
# Check Neon project is not paused (free tier issue)
```

### Users can't see their old resumes

**Problem**: Existing sessions created before authentication don't have `userId`

**Solution**:

Option A: Users recreate their resumes (they'll be linked properly)

Option B: Run migration script (advanced):
```sql
-- This won't work retroactively - old sessions will remain unlinked
-- Users need to create new sessions after logging in
```

## Email/Password vs Google OAuth

### Email/Password
**Pros**:
- No external dependencies
- Works immediately
- Full control

**Cons**:
- Users need to remember password
- No password reset flow yet (would need to add email service)

### Google OAuth
**Pros**:
- Easy for users (one click)
- No password to remember
- More secure (Google handles auth)
- Users trust Google

**Cons**:
- Requires Google Cloud setup
- Depends on Google being available

**Recommendation**: Enable both! Let users choose.

## Optional Enhancements

### 1. Password Reset

Requires email service (e.g., SendGrid, Resend):
```bash
npm install nodemailer
# Configure email provider in NextAuth
```

### 2. Email Verification

Currently users can sign up with any email. To require verification:
```typescript
// In lib/auth.ts
providers: [
  EmailProvider({
    server: process.env.EMAIL_SERVER,
    from: process.env.EMAIL_FROM,
  }),
]
```

### 3. Additional OAuth Providers

Add GitHub, LinkedIn, etc.:
```bash
npm install next-auth
# Add providers in lib/auth.ts
```

### 4. User Profile Page

Let users update name, email, password:
- Create `/profile` page
- Add update API endpoints
- Hash new passwords with bcrypt

## Cost Impact

**Before authentication**:
- Anonymous users could spam API
- No way to track usage per user

**After authentication**:
- Rate limiting per IP still applies
- Can track usage per user
- Can add usage limits per user later
- Can add billing/subscriptions later

**No additional cost** - authentication is free!

## Next Steps

1. ✅ Deploy with authentication
2. ✅ Test sign up/sign in
3. ✅ Create a resume
4. ✅ Check dashboard
5. Consider adding:
   - Password reset flow
   - Email verification
   - Usage limits per user
   - Billing/subscriptions

## Support

If you run into issues:
1. Check Vercel deployment logs
2. Check browser console for errors
3. Verify all environment variables are set
4. Check database connection
5. Review `DEPLOYMENT.md` for general deployment issues

---

You now have a production-ready resume generator with user authentication! 🎉
