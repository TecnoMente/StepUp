# StepUp - ATS Resume & Cover Letter Generator

**Instantly Tailored. Instantly Ready.**

StepUp is a full-stack web application that helps job seekers optimize their resumes and cover letters for Applicant Tracking Systems (ATS) using AI. Built with Next.js 14, TypeScript, and Claude AI (Anthropic).

## Features

- **ATS Optimization**: Automatically extract and match key terms from job descriptions
- **Resume Tailoring**: Rewrite and reorganize your resume to highlight relevant experience
- **Cover Letter Generation**: Create personalized cover letters based on your resume and job description
- **Zero Hallucination**: Evidence-based validation ensures no fabricated information
- **PDF Support**: Upload PDF resumes and download tailored documents
- **Authentication & Security**: User accounts with email/password or Google OAuth, plus email allowlist for access control
- **Local-First**: SQLite database for zero-cost local development

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM, SQLite
- **AI**: Claude Sonnet 4.5 (Anthropic) with tool use and structured outputs
- **Deployment**: Runs locally (zero infrastructure cost for MVP)

## Prerequisites

- Node.js 20+
- npm or pnpm
- Anthropic API key ([get one here](https://console.anthropic.com/))

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/your-org/stepup.git
cd stepup
```

### 2. Install dependencies

```bash
npm install
# or
pnpm install
```

### 3. Configure environment variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` and add your API keys:

```env
# Required: Anthropic Claude API Key
ANTHROPIC_API_KEY=sk-ant-your-key-here

# LLM Provider (default: anthropic)
LLM_PROVIDER=anthropic

# Database (PostgreSQL for production, SQLite for local dev)
DATABASE_URL=postgresql://stepup:stepup_dev_password@localhost:5432/stepup_dev

# Session secret (generate with: openssl rand -base64 32)
SESSION_SECRET=your-random-secret-here

# NextAuth.js secret (generate with: openssl rand -base64 32)
NEXTAUTH_SECRET=your-nextauth-secret-here
NEXTAUTH_URL=http://localhost:3000

# Email Allowlist (comma-separated, REQUIRED for access)
ALLOWED_EMAILS=your-email@example.com,teammate@example.com
```

**Security Note**: The application is secure by default. You MUST add email addresses to `ALLOWED_EMAILS` to grant access. If left empty, no one can sign up or sign in.

### 4. Set up the database

```bash
npm run db:push
```

### 5. (Optional) Seed with sample data

```bash
npm run db:seed
```

### 6. Run the development server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### 1. Landing Page
- **Paste a job description** in the left card
- **Upload your resume** (PDF format) in the middle card
- **Add extra information** (optional) in the right card
- Click **"Generate Tailored Resume"**

### 2. Resume Result Page
- Review your tailored resume with ATS alignment score
- See how many key terms were matched
- Download as HTML (use browser Print → Save as PDF)
- Generate a tailored cover letter

### 3. Cover Letter Result Page
- Review your personalized cover letter
- Download as HTML (use browser Print → Save as PDF)

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/session` | POST | Create a new session |
| `/api/upload` | POST | Upload and parse PDF resume |
| `/api/generate/ats-terms` | POST | Extract ATS terms from job description |
| `/api/generate/resume` | POST | Generate tailored resume |
| `/api/generate/cover-letter` | POST | Generate tailored cover letter |
| `/api/download/resume` | GET | Download resume as HTML |
| `/api/download/cover-letter` | GET | Download cover letter as HTML |

## Project Structure

```
stepup/
├── app/                      # Next.js App Router pages
│   ├── api/                  # API routes
│   ├── resume/               # Resume result page
│   ├── cover-letter/         # Cover letter result page
│   ├── layout.tsx            # Root layout
│   ├── page.tsx              # Landing page
│   └── globals.css           # Global styles
├── lib/                      # Core libraries
│   ├── llm/                  # LLM client (Claude)
│   ├── utils/                # Utilities (PDF, validation, DB)
│   └── types.ts              # TypeScript types
├── prisma/                   # Database schema and migrations
│   ├── schema.prisma         # Prisma schema
│   └── seed.ts               # Seed data
├── .github/workflows/        # GitHub Actions CI
├── .env.example              # Environment variables template
├── package.json              # Dependencies and scripts
└── README.md                 # This file
```

## Key Features Explained

### Authentication & Access Control

StepUp includes built-in authentication with flexible access control:

- **NextAuth.js Integration**: Secure authentication with JWT sessions
- **Multiple Sign-In Methods**: Email/password and Google OAuth
- **Email Allowlist**: Restrict access to specific email addresses via `ALLOWED_EMAILS` environment variable
- **Protected Routes**: Middleware automatically protects all app routes, redirecting unauthenticated users to sign-in
- **User Sessions**: Each user's resume generations are linked to their account

Access control is enabled by default:
1. **Required**: Set `ALLOWED_EMAILS` in `.env` (e.g., `tecnomente@umich.edu,user@example.com`)
2. Users not on the allowlist will be blocked with an access denied page
3. If `ALLOWED_EMAILS` is empty, NO ONE can access (secure by default)

See `lib/utils/allowlist.ts` and `middleware.ts` for implementation details.

### Non-Hallucination Contract

StepUp uses a strict evidence validation system to prevent AI hallucinations:

1. **Structured Outputs**: Claude uses tool calling with JSON schemas
2. **Evidence Spans**: Every fact includes character offsets pointing to source text
3. **Server Validation**: API validates all evidence spans before returning results
4. **Transparency**: UI shows "All content is derived from your inputs"

See `lib/utils/validation.ts` for implementation details.

### Claude Integration

The LLM client (`lib/llm/client.ts`) is optimized for Claude Sonnet 4.5:

- Uses Claude's **tool use API** for structured JSON outputs
- Temperature set to 0.1 for consistency
- System prompts enforce strict factual accuracy
- Evidence-based citations for every claim

### Cost Optimization

This MVP is designed for **zero infrastructure cost**:

- **SQLite database**: No hosted database needed
- **Local development**: Runs on your machine
- **Pay-as-you-go AI**: Claude API costs ~$0.003 per resume (3 cents per 10 resumes)
- **GitHub Actions**: Free for public repos or included in GitHub Team

## Development

### Run tests

```bash
npm test
```

### Build for production

```bash
npm run build
npm start
```

### Type checking

```bash
npx tsc --noEmit
```

### Database commands

```bash
# Push schema changes
npm run db:push

# Reset database
rm prisma/dev.db
npm run db:push
```

## Deployment Options

### Option 1: Local Only (Free)
Just run `npm run dev` on your machine. Perfect for MVP.

### Option 2: GitHub Pages (Free)
For static export (requires modifications to remove API routes):
```bash
npm run build
# Deploy the `out/` directory to GitHub Pages
```

### Option 3: Vercel/Netlify (Free tier available)
- Connect your GitHub repo
- Add `ANTHROPIC_API_KEY` to environment variables
- Deploy automatically on push

## GitHub Team Setup

Since you have a GitHub Team account:

1. **Repository Settings**:
   - Enable branch protection for `main`
   - Require PR reviews before merging
   - Enable GitHub Actions for CI

2. **Secrets**:
   - Go to Settings → Secrets and variables → Actions
   - Add `ANTHROPIC_API_KEY` for CI (if running tests)

3. **Collaboration**:
   - Invite team members
   - Use feature branches (`feature/resume-generation`)
   - Create PRs for code review

## Troubleshooting

### "ANTHROPIC_API_KEY is required"
Make sure you've created a `.env` file with your API key.

### PDF parsing fails
Ensure the uploaded file is a valid PDF (not a scanned image).

### Database errors
Reset the database:
```bash
rm prisma/dev.db
npm run db:push
```

### TypeScript errors
Install dependencies and generate Prisma client:
```bash
npm install
npx prisma generate
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - feel free to use this for your projects!

## Credits

Built with:
- [Next.js](https://nextjs.org/)
- [Claude AI](https://www.anthropic.com/claude) by Anthropic
- [Prisma](https://www.prisma.io/)
- [Tailwind CSS](https://tailwindcss.com/)

---

**Note**: This is an MVP designed for students with zero infrastructure cost. For production use, consider:
- Switching to PostgreSQL
- Adding user authentication
- Implementing rate limiting
- Setting up proper monitoring
- Using a PDF generation library (instead of HTML print)

## Support

For issues or questions, please [open an issue](https://github.com/your-org/stepup/issues) on GitHub.
