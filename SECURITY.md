# Security Features

StepUp implements multiple layers of security to protect user data and prevent abuse.

## Overview

User resumes contain highly sensitive personal information (PII). This document outlines the security measures implemented to protect that data.

## Implemented Security Features

### 1. Database Security

**PostgreSQL Support**
- Migrated from SQLite to PostgreSQL for production deployments
- Support for encryption at rest (via Neon, Vercel Postgres, or other providers)
- SSL/TLS connections required (`?sslmode=require`)

**Schema Location**: `prisma/schema.prisma`

### 2. Session Management

**Session Expiration**
- Sessions automatically expire after 7 days of inactivity
- Expired sessions are immediately rejected and deleted
- Configurable via `SESSION_EXPIRY_HOURS` in `app/api/session/route.ts`

**Session Validation**
- Utility functions in `lib/utils/session.ts`:
  - `validateSession()` - Checks if session exists and is not expired
  - `extendSession()` - Extends expiration on activity

### 3. Data Retention & Cleanup

**Automatic Cleanup**
- Sessions older than 30 days are automatically deleted
- Runs daily at 2 AM UTC via Vercel Cron
- Prevents indefinite storage of sensitive resume data

**Implementation**:
- Cleanup logic: `lib/utils/cleanup.ts`
- Cron endpoint: `app/api/cron/cleanup/route.ts`
- Configured in: `vercel.json`

**Functions**:
- `cleanupExpiredSessions()` - Removes expired sessions
- `cleanupOldSessions(days)` - Removes sessions older than X days
- `performCleanup()` - Combined cleanup (runs both)

### 4. Rate Limiting

**Per-IP Rate Limits**:
- Session creation: 5 per hour
- Resume generation: 10 per hour
- Cover letter generation: 20 per hour
- Other API routes: 100 per 15 minutes

**Implementation**: `lib/utils/rate-limit.ts`

**Features**:
- In-memory token bucket algorithm
- Returns `429 Too Many Requests` when exceeded
- Includes `X-RateLimit-*` headers
- Automatic cleanup of old rate limit entries

**Endpoints with rate limiting**:
- `app/api/session/route.ts`
- `app/api/generate/resume/route.ts`
- `app/api/generate/cover-letter/route.ts`

**Production Note**: For distributed deployments, consider upgrading to Redis or Vercel KV for cross-instance rate limiting.

### 5. Security Headers

**HTTP Security Headers** (configured in `next.config.mjs`):

| Header | Value | Purpose |
|--------|-------|---------|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Forces HTTPS for 2 years |
| `X-Frame-Options` | `SAMEORIGIN` | Prevents clickjacking |
| `X-Content-Type-Options` | `nosniff` | Prevents MIME sniffing |
| `X-XSS-Protection` | `1; mode=block` | Enables browser XSS filter |
| `Referrer-Policy` | `origin-when-cross-origin` | Limits referrer leakage |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Disables unnecessary APIs |
| `Content-Security-Policy` | See below | Prevents XSS/injection attacks |

**Content Security Policy**:
```
default-src 'self';
script-src 'self' 'unsafe-eval' 'unsafe-inline';
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob:;
font-src 'self' data:;
connect-src 'self' https://api.anthropic.com;
frame-ancestors 'self';
```

**Test security headers**: https://securityheaders.com

### 6. Environment Variable Protection

**Sensitive Variables**:
- `ANTHROPIC_API_KEY` - Claude API access
- `SESSION_SECRET` - Session security
- `CRON_SECRET` - Cron endpoint protection
- `DATABASE_URL` - Database credentials

**Best Practices**:
- Never commit `.env` to Git (already in `.gitignore`)
- Use Vercel's encrypted environment variables in production
- Rotate secrets every 90 days
- Generate secrets with: `openssl rand -base64 32`

### 7. HTTPS/TLS Encryption

**Data in Transit**:
- All production traffic over HTTPS (Vercel enforces this)
- Database connections use SSL (`?sslmode=require`)
- API calls to Anthropic use HTTPS

**Certificate Management**:
- Automatic via Vercel (Let's Encrypt)
- Auto-renewal every 90 days

## Security Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         User Browser                         │
│                      (HTTPS enforced)                        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                     Vercel Edge Network                      │
│  • Rate Limiting (per-IP)                                    │
│  • DDoS Protection                                           │
│  • Security Headers                                          │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Next.js Application                       │
│  • Session Validation                                        │
│  • Input Sanitization                                        │
│  • Evidence Validation                                       │
└────┬─────────────────────────────────┬──────────────────────┘
     │                                 │
     ▼                                 ▼
┌─────────────────┐          ┌──────────────────────┐
│  PostgreSQL DB  │          │   Anthropic API      │
│  (Encrypted)    │          │   (HTTPS only)       │
│  • SSL/TLS      │          │   • API key auth     │
│  • Backups      │          │   • Usage limits     │
└─────────────────┘          └──────────────────────┘
```

## Data Flow & Security

### Resume Generation Flow

1. **User uploads resume** → Parsed server-side (no client-side access)
2. **Data stored in session** → Expires after 7 days, deleted after 30 days
3. **Rate limit checked** → Max 10 generations per hour per IP
4. **API call to Claude** → Over HTTPS, with API key authentication
5. **Evidence validation** → Ensures all content traces to source documents
6. **Response returned** → Over HTTPS with security headers

### What We Store

**Stored in database**:
- Session ID (random CUID)
- Resume text (parsed from PDF)
- Job description text
- Extra information (user-provided)
- Generated resume JSON
- Generated cover letter JSON
- ATS terms array
- Timestamps (created, updated, expires)

**NOT stored**:
- User email/account info (no authentication yet)
- Payment information (no payments yet)
- IP addresses (only used for rate limiting, not persisted)
- Original PDF files (only parsed text)

### What We Send to Third Parties

**Anthropic Claude API**:
- Resume text
- Job description text
- Extra information
- ATS keywords

**What we DON'T send**:
- Session IDs
- Database records
- User metadata

## Compliance Considerations

### GDPR (EU Users)

**Required for compliance**:
- [ ] Add Privacy Policy
- [ ] Implement data export (user can download their data)
- [ ] Implement data deletion (user can request deletion)
- [ ] Add cookie consent banner
- [ ] Update data processing agreements with Anthropic

### CCPA (California Users)

**Required for compliance**:
- [ ] Add "Do Not Sell My Data" option
- [ ] Implement data deletion requests
- [ ] Add Privacy Policy

### SOC 2 (Enterprise Customers)

**Current status**:
- ✅ Vercel is SOC 2 Type II certified
- ✅ Neon is SOC 2 Type II certified
- ✅ Anthropic is SOC 2 Type II certified
- ⚠️ Your application itself is not independently certified

## Threat Model

### Threats Mitigated

| Threat | Mitigation |
|--------|-----------|
| **API Key Theft** | Environment variables encrypted, never exposed to client |
| **Session Hijacking** | Session IDs are random CUIDs (impossible to guess) |
| **Data Breach** | Database encrypted at rest, SSL in transit |
| **XSS Attacks** | CSP headers, React auto-escaping, input sanitization |
| **CSRF Attacks** | Next.js built-in CSRF protection |
| **DDoS Attacks** | Vercel edge network + rate limiting |
| **SQL Injection** | Prisma ORM (parameterized queries) |
| **Data Retention** | Automatic cleanup after 30 days |

### Remaining Risks

| Risk | Severity | Mitigation Plan |
|------|----------|----------------|
| **No User Authentication** | Medium | Add NextAuth.js |
| **In-Memory Rate Limiting** | Low | Upgrade to Redis/Vercel KV |
| **No Audit Logging** | Medium | Add structured logging |
| **No Input Validation** | Medium | Add Zod schemas |
| **No Data Export** | Low | Add export API endpoint |

## Security Roadmap

### Phase 1: Essential (Current)
- ✅ HTTPS everywhere
- ✅ Environment secrets
- ✅ Rate limiting
- ✅ Session expiration
- ✅ Data retention policy
- ✅ Security headers

### Phase 2: Enhanced (Recommended)
- [ ] User authentication (NextAuth.js)
- [ ] Input validation (Zod schemas)
- [ ] Audit logging (who accessed what, when)
- [ ] Redis-based rate limiting (distributed)
- [ ] Error monitoring (Sentry)

### Phase 3: Enterprise (Optional)
- [ ] SSO integration (SAML, OAuth)
- [ ] Data export API (GDPR compliance)
- [ ] IP allowlisting
- [ ] Field-level encryption
- [ ] SOC 2 audit
- [ ] Penetration testing

## Incident Response Plan

### If API Key is Compromised

1. **Immediately**: Rotate `ANTHROPIC_API_KEY` in Vercel dashboard
2. **Check usage**: Review Anthropic console for unusual activity
3. **Review logs**: Check Vercel logs for suspicious requests
4. **Notify users**: If data was accessed, notify affected users

### If Database is Compromised

1. **Immediately**: Rotate `DATABASE_URL` credentials
2. **Assess damage**: Review which sessions were accessed
3. **Notify users**: Email affected users (requires adding authentication first)
4. **Review backups**: Restore from last known good backup if needed
5. **Update security**: Add additional layers (IP allowlisting, etc.)

### If Session Hijacking Detected

1. **Immediately**: Delete compromised session
2. **Review logs**: Identify attack vector (XSS? MITM?)
3. **Patch vulnerability**: Fix underlying issue
4. **Force reauth**: Require new session creation

## Security Contact

For security issues, please:
1. **Do NOT** open a public GitHub issue
2. Email: [YOUR_EMAIL_HERE]
3. Include: Description, steps to reproduce, impact assessment

Expected response time: 48 hours

## Security Testing

### Manual Testing Checklist

- [ ] Try accessing expired session (should fail)
- [ ] Exceed rate limit (should return 429)
- [ ] Test HTTPS redirect (HTTP should redirect to HTTPS)
- [ ] Check security headers (use securityheaders.com)
- [ ] Test CSP (check browser console for violations)
- [ ] Verify database uses SSL (check connection string)

### Automated Testing

```bash
# Test rate limiting
for i in {1..20}; do
  curl -X POST https://your-app.vercel.app/api/session
  echo ""
done

# Check security headers
curl -I https://your-app.vercel.app | grep -i "strict-transport"

# Test session expiration (requires database access)
# Set expiresAt to past date, then try to access session
```

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security](https://nextjs.org/docs/app/building-your-application/configuring/security-headers)
- [Vercel Security](https://vercel.com/docs/security)
- [Anthropic Security](https://www.anthropic.com/security)
- [Neon Security](https://neon.tech/docs/security)

## Changelog

- **2025-11-18**: Initial security implementation
  - Added session expiration
  - Added automatic cleanup
  - Added rate limiting
  - Added security headers
  - Migrated to PostgreSQL
