# StepUp - Quick Setup Guide

Welcome! This guide will help you get StepUp running on your machine in under 10 minutes.

## Prerequisites Checklist

- [ ] Node.js 20+ installed ([Download here](https://nodejs.org/))
- [ ] Docker Desktop installed ([Download here](https://www.docker.com/products/docker-desktop/))
- [ ] Anthropic API key ([Get one here](https://console.anthropic.com/))
- [ ] Git installed (already done since you cloned the repo)

## Step-by-Step Setup

### 1. Verify Node.js Installation

```bash
node --version
# Should show v20.x.x or higher
```

### 2. Start Docker Desktop

Make sure Docker Desktop is running on your machine. You should see the Docker icon in your system tray.

### 3. Configure Your API Key

Edit the `.env` file in the root directory and add your Anthropic API key:

```bash
# Open .env and add your actual API key
ANTHROPIC_API_KEY=sk-ant-api03-your-actual-key-here
```

The `.env` file should contain:
```env
ANTHROPIC_API_KEY=sk-ant-api03-your-actual-key-here
LLM_PROVIDER=anthropic
DATABASE_URL=postgresql://stepup:stepup_dev_password@localhost:5432/stepup_dev
SESSION_SECRET=development-secret-change-in-production
NEXTAUTH_SECRET=your-secret-here
NEXTAUTH_URL=http://localhost:3000
```

**IMPORTANT**: Never commit your `.env` file to Git! It's already in `.gitignore`.

### 4. Start PostgreSQL Database

```bash
docker-compose up -d
```

This starts PostgreSQL in a Docker container. You should see:
```
Container stepup-postgres  Started
```

### 5. Set Up Database Schema

```bash
npm run db:push
```

This creates all the necessary database tables.

### 6. Start the Development Server

```bash
npm run dev
```

You should see:
```
  ▲ Next.js 14.2.18
  - Local:        http://localhost:3000
  - Environments: .env
```

### 7. Open in Browser

Visit: [http://localhost:3000](http://localhost:3000)

You should be redirected to the sign-in page!

## Testing the Application

### First Time: Create an Account

1. **Sign Up**
   - Click "create a new account"
   - Enter your email and password (min 8 characters)
   - Or use "Continue with Google" if you've set up Google OAuth

2. **You're Logged In!**
   - You'll be redirected to the main application

### Generate Your First Resume

1. **Paste a Job Description**
   - Try this sample:
   ```
   Software Engineer - Full Stack
   Looking for someone with React, TypeScript, and Node.js experience.
   ```

2. **Upload Your Resume**
   - Click "Upload Resume" and select a PDF file

3. **Click "Generate Tailored Resume"**
   - This will call the Claude API (costs about $0.003 per resume)

4. **View Results**
   - See your tailored resume with ATS score
   - Generate a cover letter
   - Download both as PDFs

5. **Access from Dashboard**
   - Click "My Resumes" in the navigation
   - See all your past resumes and cover letters
   - Access them from any device after logging in

## Troubleshooting

### "ANTHROPIC_API_KEY is required" error

- Make sure you've edited `.env` and added your real API key
- Restart the dev server after changing `.env`

### Docker/PostgreSQL issues

**Can't connect to database:**
```bash
# Check if Docker is running
docker ps

# Restart PostgreSQL
docker-compose down
docker-compose up -d

# Wait a few seconds for it to start, then:
npm run db:push
```

**Database tables don't exist:**
```bash
# Push the schema again
npm run db:push
```

**Reset database completely:**
```bash
# WARNING: This deletes all data!
docker-compose down -v
docker-compose up -d
npm run db:push
```

### Port 3000 already in use

```bash
# Use a different port
PORT=3001 npm run dev
```

### Authentication issues

**Can't sign in:**
- Make sure PostgreSQL is running (`docker ps` should show `stepup-postgres`)
- Check that `NEXTAUTH_SECRET` is set in `.env`
- Clear browser cookies and try again

**Google OAuth not working:**
- Make sure you've set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env`
- Check that redirect URIs are correct in Google Cloud Console

### Build errors

```bash
# Clean install
rm -rf node_modules .next
npm install
npx prisma generate
npm run build
```

## Cost Estimate

For students testing this MVP:

- **Claude API**: ~$0.003 per resume (3 cents for 10 resumes)
- **Infrastructure**: $0 (runs locally)
- **Total first month**: $0.10 - $1.00 (if you generate 30-300 resumes)

Claude offers $5 free credits when you sign up, which covers ~1,600 resume generations!

## Next Steps

1. Test with your own resume and real job descriptions
2. Share feedback with your team
3. Consider deploying to Vercel (free tier) when ready
4. Read the main README.md for advanced features

## Getting Help

- **Questions?** Open an issue on GitHub
- **Bugs?** Check the main README troubleshooting section
- **API Issues?** Check your API key at [Anthropic Console](https://console.anthropic.com/)

## Production Deployment

Ready to deploy for others to use? See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for a complete guide.

**Security features already implemented:**
- ✅ Session expiration (7 days)
- ✅ Automatic cleanup (30-day retention)
- ✅ Rate limiting (prevents API abuse)
- ✅ Security headers (HTTPS, CSP, XSS protection)
- ✅ PostgreSQL support with encryption

**Recommended hosting**: Vercel (free tier) + Neon PostgreSQL (free tier)

**Estimated cost**: ~$1.50/month for 500 resume generations

---

Happy job hunting! 🎉
