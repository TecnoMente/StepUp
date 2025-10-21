# StepUp - Quick Setup Guide

Welcome! This guide will help you get StepUp running on your machine in under 5 minutes.

## Prerequisites Checklist

- [ ] Node.js 20+ installed ([Download here](https://nodejs.org/))
- [ ] Anthropic API key ([Get one here](https://console.anthropic.com/))
- [ ] Git installed (already done since you cloned the repo)

## Step-by-Step Setup

### 1. Verify Node.js Installation

```bash
node --version
# Should show v20.x.x or higher
```

### 2. Configure Your API Key

Edit the `.env` file that's already created in the root directory:

```bash
# Open .env and replace "your-key-here-replace-this" with your actual API key
# It should look like: sk-ant-api03-...
```

The `.env` file contents:
```env
ANTHROPIC_API_KEY=sk-ant-api03-your-actual-key-here
LLM_PROVIDER=anthropic
DATABASE_URL="file:./dev.db"
SESSION_SECRET=development-secret-change-in-production
```

**IMPORTANT**: Never commit your `.env` file to Git! It's already in `.gitignore`.

### 3. Start the Development Server

```bash
npm run dev
```

You should see:
```
  ▲ Next.js 14.2.18
  - Local:        http://localhost:3000
  - Environments: .env
```

### 4. Open in Browser

Visit: [http://localhost:3000](http://localhost:3000)

You should see the StepUp landing page with three cards!

## Testing the Application

### Quick Test Flow

1. **Paste a Job Description** (left card)
   - Try this sample:
   ```
   Software Engineer - Full Stack
   Looking for someone with React, TypeScript, and Node.js experience.
   ```

2. **Upload Your Resume** (middle card)
   - Use any PDF resume (sample will be provided if needed)

3. **Click "Generate Tailored Resume"**
   - This will call the Claude API (costs about $0.003 per resume)

4. **View Results**
   - See your tailored resume with ATS score
   - Generate a cover letter
   - Download both as HTML (use Print → Save as PDF)

## Troubleshooting

### "ANTHROPIC_API_KEY is required" error

- Make sure you've edited `.env` and added your real API key
- Restart the dev server after changing `.env`

### Port 3000 already in use

```bash
# Use a different port
PORT=3001 npm run dev
```

### Database issues

```bash
# Reset the database
rm prisma/dev.db
npm run db:push
```

### Build errors

```bash
# Clean install
rm -rf node_modules .next
npm install
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

## Production Checklist (when ready to deploy)

- [ ] Get production Claude API key
- [ ] Update `SESSION_SECRET` in `.env`
- [ ] Switch to PostgreSQL (from SQLite)
- [ ] Add rate limiting
- [ ] Set up error monitoring (e.g., Sentry)
- [ ] Configure CORS if needed
- [ ] Add user authentication

---

Happy job hunting! 🎉
