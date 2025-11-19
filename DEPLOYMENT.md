# StepUp Deployment Guide

This guide walks you through deploying StepUp securely to Vercel with a PostgreSQL database.

**Note**: This guide is for deploying to production. For local development with Docker, see [DOCKER.md](./DOCKER.md).

## Security Features Implemented

- ✅ **User Authentication**: Email/password + optional Google OAuth
- ✅ **Session Expiration**: Sessions expire after 7 days of inactivity
- ✅ **Automatic Cleanup**: Old sessions (>30 days) are automatically deleted daily
- ✅ **Rate Limiting**: Prevents API abuse
  - Resume generation: 10 requests/hour per IP
  - Cover letter generation: 20 requests/hour per IP
  - Session creation: 5 sessions/hour per IP
- ✅ **Security Headers**: HTTPS enforcement, XSS protection, CSP, etc.
- ✅ **Database Encryption**: PostgreSQL with encryption at rest
- ✅ **Environment Secrets**: API keys encrypted in Vercel
- ✅ **Protected Routes**: Must be logged in to use the application

## Prerequisites

1. GitHub account (free)
2. Vercel account (free) - sign up at https://vercel.com
3. Neon account (free) - sign up at https://neon.tech
4. Anthropic API key - get from https://console.anthropic.com
5. (Optional) Google OAuth credentials - for "Sign in with Google"

## Deployment Steps

### 1. Set Up PostgreSQL Database (Neon)

1. Go to https://console.neon.tech
2. Click "Create Project"
3. Choose a name (e.g., "stepup-db")
4. Select a region close to your users
5. Click "Create Project"
6. Copy the connection string (starts with `postgresql://`)
   - Format: `postgresql://user:password@host/database?sslmode=require`
   - **Save this securely** - you'll need it for Vercel

### 2. Push Your Code to GitHub

```bash
# Initialize git (if not already done)
git init
git add .
git commit -m "Initial commit with security improvements"

# Create a new repository on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

### 3. Deploy to Vercel

1. Go to https://vercel.com/new
2. Click "Import Git Repository"
3. Select your GitHub repository
4. Configure project:
   - **Framework Preset**: Next.js
   - **Build Command**: `npm run build`
   - **Install Command**: `pnpm install --frozen-lockfile`

5. **Add Environment Variables** (click "Environment Variables"):

   ```
   ANTHROPIC_API_KEY=sk-ant-your-actual-key-here
   LLM_PROVIDER=anthropic
   DATABASE_URL=postgresql://user:password@host/database?sslmode=require
   SESSION_SECRET=generate-with-openssl-rand-base64-32
   CRON_SECRET=generate-with-openssl-rand-base64-32
   ```

   **How to generate secrets:**
   ```bash
   openssl rand -base64 32
   ```

6. Click "Deploy"

### 4. Set Up Database Schema

After deployment completes:

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Link your project
vercel link

# Run database migration
vercel env pull .env.production
npx prisma db push
```

**Alternative**: Use Vercel dashboard's "Remote Build" feature:
1. Go to your project settings
2. Click "Deployments" → "..." → "Redeploy"
3. Check "Use existing build cache"

### 5. Enable Automatic Session Cleanup (Vercel Cron)

The `vercel.json` file already configures a daily cron job at 2 AM UTC.

Vercel Cron is included in the free tier with these limits:
- 1 cron job per project (free tier)
- Runs daily at 2 AM UTC

**To verify cron is working:**
1. Go to Vercel Dashboard → Your Project → "Cron Jobs"
2. You should see: `/api/cron/cleanup` scheduled for `0 2 * * *`

### 6. Test Your Deployment

1. Visit your deployment URL (e.g., `https://your-app.vercel.app`)
2. Test creating a session
3. Upload a resume
4. Generate a tailored resume

**Check rate limiting:**
```bash
# This should fail after 5 attempts in an hour
for i in {1..10}; do curl -X POST https://your-app.vercel.app/api/session; done
```

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | ✅ Yes | Your Claude API key from Anthropic |
| `LLM_PROVIDER` | ✅ Yes | Set to `anthropic` |
| `DATABASE_URL` | ✅ Yes | PostgreSQL connection string from Neon |
| `SESSION_SECRET` | ✅ Yes | Random secret for session security |
| `CRON_SECRET` | ⚠️ Optional | Secret to protect cleanup endpoint |

## Security Best Practices

### 1. Rotate API Keys Regularly
- Rotate `ANTHROPIC_API_KEY` every 90 days
- Update in Vercel dashboard: Settings → Environment Variables

### 2. Monitor Usage
- Check Anthropic usage: https://console.anthropic.com/settings/usage
- Check Vercel analytics for unusual traffic patterns
- Check Neon database size: https://console.neon.tech

### 3. Set Up Alerts (Optional)

**Anthropic API Usage Alerts:**
1. Go to https://console.anthropic.com/settings/limits
2. Set monthly spending limits
3. Enable email alerts

**Vercel Resource Alerts:**
1. Vercel Dashboard → Settings → Notifications
2. Enable deployment failure notifications

### 4. Database Backups

Neon free tier includes:
- Automatic backups (7-day retention)
- Point-in-time recovery

**To manually export data:**
```bash
# Export all sessions
pg_dump $DATABASE_URL > backup.sql
```

## Rate Limits Summary

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/api/session` | 5 requests | per hour |
| `/api/generate/resume` | 10 requests | per hour |
| `/api/generate/cover-letter` | 20 requests | per hour |
| Other API routes | 100 requests | per 15 min |

**To adjust rate limits**, edit `lib/utils/rate-limit.ts`

## Data Retention Policy

- **Session expiration**: 7 days of inactivity
- **Automatic cleanup**: Sessions older than 30 days are deleted daily
- **Manual cleanup**: Run `GET /api/cron/cleanup` (requires `CRON_SECRET`)

**To adjust retention**, edit:
- Session expiration: `app/api/session/route.ts` → `SESSION_EXPIRY_HOURS`
- Cleanup age: `lib/utils/cleanup.ts` → `cleanupOldSessions(days)`

## Troubleshooting

### Database Connection Errors

**Error**: `Can't reach database server`

**Solution**:
1. Verify `DATABASE_URL` is correct in Vercel dashboard
2. Ensure connection string includes `?sslmode=require`
3. Check Neon project is not paused (free tier pauses after 7 days inactivity)

### Rate Limit Issues

**Error**: `Rate limit exceeded`

**Solution**:
- Rate limits reset automatically after the time window
- To test locally, restart the development server (clears in-memory store)
- For production, consider upgrading to Redis/Vercel KV for distributed rate limiting

### Cron Job Not Running

**Symptoms**: Old sessions not being cleaned up

**Solution**:
1. Check Vercel Dashboard → Cron Jobs → View Logs
2. Verify `vercel.json` is committed to your repository
3. Redeploy the project

### Build Failures

**Error**: `Prisma Client could not be generated`

**Solution**:
```bash
npx prisma generate
git add .
git commit -m "Update Prisma client"
git push
```

## Cost Breakdown (Free Tier)

| Service | Free Tier | Limits |
|---------|-----------|--------|
| **Vercel** | ✅ Free | 100GB bandwidth, 6000 build minutes/month |
| **Neon (PostgreSQL)** | ✅ Free | 0.5GB storage, always-on compute |
| **Anthropic API** | 💰 Pay-as-you-go | ~$0.003 per resume generation |

**Estimated monthly cost** (100 users, 5 resumes each):
- Vercel: $0 (within free tier)
- Neon: $0 (within free tier)
- Anthropic: ~$1.50 (500 generations × $0.003)

**Total**: ~$1.50/month for 500 resume generations

## Upgrading for Production Use

If you need higher limits:

### Vercel Pro ($20/month per member)
- Commercial use allowed
- Increased bandwidth (1TB)
- Analytics
- Enhanced DDoS protection

### Neon Scale ($19/month)
- 10GB storage
- Higher compute limits
- Daily backups retention

### Redis Rate Limiting (Vercel KV - $1/month)
- Distributed rate limiting across edge functions
- More accurate rate limiting under high load

## Support

- **Vercel Docs**: https://vercel.com/docs
- **Neon Docs**: https://neon.tech/docs
- **Anthropic Docs**: https://docs.anthropic.com
- **Project Issues**: https://github.com/YOUR_USERNAME/YOUR_REPO/issues

## Security Checklist

Before going live, verify:

- [ ] All environment variables are set in Vercel
- [ ] `DATABASE_URL` uses SSL (`?sslmode=require`)
- [ ] `SESSION_SECRET` and `CRON_SECRET` are unique random values
- [ ] Cron job is scheduled and running
- [ ] Rate limiting is working (test with multiple requests)
- [ ] HTTPS is enforced (Vercel does this automatically)
- [ ] Security headers are present (check with https://securityheaders.com)
- [ ] Anthropic API usage limits are set
- [ ] Database backups are enabled (Neon does this automatically)

## Additional Hardening (Optional)

### 1. Add DDoS Protection
Vercel includes basic DDoS protection, but for additional security:
- Enable Cloudflare (free tier) in front of Vercel
- Configure firewall rules

### 2. Add Authentication
Currently, anyone with a session ID can access their session. To add user authentication:
- Integrate NextAuth.js
- Associate sessions with user accounts
- Add email/password or OAuth (Google, GitHub)

### 3. Add Logging/Monitoring
- Integrate Sentry for error tracking (free tier available)
- Use Vercel Analytics for usage insights
- Set up custom logging with LogTail or similar

### 4. Add IP Allowlisting (Enterprise)
Restrict database access to Vercel's IP ranges:
- Neon → Settings → IP Allow
- Add Vercel edge function IPs

## License & Privacy

When deploying for public use, ensure:
- Add a Privacy Policy (user resume data handling)
- Add Terms of Service
- Comply with GDPR/CCPA if serving EU/CA users
- Display "Powered by Claude AI" attribution (Anthropic requirement)
