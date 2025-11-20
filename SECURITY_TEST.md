# Email Allowlist Security Testing

## How to Test the Email Allowlist Feature

### 1. Configure the Allowlist

Edit your `.env` file and set specific allowed emails:

```env
ALLOWED_EMAILS=your-approved-email@example.com,another-approved@example.com
```

**Important**: Make sure there are NO spaces between emails, only commas.

### 2. Restart Your Dev Server

After changing `.env`, restart the server:

```bash
# Stop the current server (Ctrl+C)
npm run dev
```

### 3. Test Scenarios

#### Scenario A: Unauthorized Email (Should Be Blocked)

1. Go to `http://localhost:3000/auth/signup`
2. Try to sign up with an email NOT in `ALLOWED_EMAILS`
3. **Expected Result**: Error message "This email is not authorized to sign up. Please contact an administrator for access."

#### Scenario B: Unauthorized Login Attempt (Should Be Blocked)

1. If you previously created an account with an email not on the allowlist
2. Go to `http://localhost:3000/auth/signin`
3. Try to sign in with that unauthorized email
4. **Expected Result**: Redirected to `/auth/access-denied` page with message:
   - "Access Denied"
   - "You don't have access to use this website"
   - Contact info: "Team Tecnomente - tecnomente@umich.edu"

#### Scenario C: Authorized Email (Should Work)

1. Go to `http://localhost:3000/auth/signup`
2. Sign up with an email that IS in `ALLOWED_EMAILS`
3. **Expected Result**: Account created successfully
4. Sign in with that email
5. **Expected Result**: Successfully logged in and redirected to dashboard

#### Scenario D: Google OAuth with Unauthorized Email

1. Make sure `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are configured
2. Go to `http://localhost:3000/auth/signin`
3. Click "Continue with Google"
4. Sign in with a Google account whose email is NOT in `ALLOWED_EMAILS`
5. **Expected Result**: Error message or redirect to access denied page

#### Scenario E: Removing User from Allowlist

1. Sign in with an authorized email
2. Edit `.env` and REMOVE that email from `ALLOWED_EMAILS`
3. Restart the dev server
4. Try to access any protected page (e.g., `/dashboard`)
5. **Expected Result**: Session should be invalidated and redirected to sign-in

### 4. Verify Access Denied Page

The access denied page should display:
- Red warning icon
- "Access Denied" heading
- "You don't have access to use this website" message
- Blue info box: "This application is currently restricted to authorized users only"
- Contact section: "Team Tecnomente" with email `tecnomente@umich.edu`
- "Back to Sign In" link

### 5. Security Model

**The application is secure by default:**

```env
ALLOWED_EMAILS=
```

If `ALLOWED_EMAILS` is empty (no emails after the equals sign), **NO ONE** can access the application. You must explicitly add emails to grant access:

```env
ALLOWED_EMAILS=tecnomente@umich.edu,approved-user@example.com
```

## Current Implementation Details

### Security Layers

1. **Signup Route** (`/api/auth/signup`): Checks allowlist before creating account
2. **Credentials Provider** (`lib/auth.ts`): Checks allowlist during password sign-in
3. **Google OAuth Provider** (`lib/auth.ts`): Checks allowlist during Google sign-in
4. **SignIn Callback** (`lib/auth.ts`): Additional check that redirects to access-denied page
5. **Session Callback** (`lib/auth.ts`): Validates allowlist on every session request
6. **Middleware** (`middleware.ts`): Requires authentication for all non-public routes

### Protected Routes

All routes except these are protected:
- `/` (landing page)
- `/auth/signin`
- `/auth/signup`
- `/auth/error`
- `/auth/access-denied`
- `/api/auth/*` (NextAuth API routes)

## Troubleshooting

### "Still allowing me to log in even though email not on allowlist"

1. Make sure you saved the `.env` file
2. Restart the dev server completely (Ctrl+C then `npm run dev`)
3. Clear your browser cookies/session or use incognito mode
4. Check for typos in the email addresses in `ALLOWED_EMAILS`
5. Verify no spaces between emails (should be `email1@x.com,email2@x.com`)

### "Getting errors after adding allowlist"

1. Check the console/terminal for error messages
2. Make sure `ALLOWED_EMAILS` format is correct (comma-separated, no spaces)
3. Try clearing Next.js cache: `rm -rf .next && npm run dev`

## Contact

For access to the StepUp application, contact:
**Team Tecnomente**: tecnomente@umich.edu
