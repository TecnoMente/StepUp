# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

StepUp is an ATS (Applicant Tracking System) resume and cover letter generator built with Next.js 14, TypeScript, and Claude AI (Anthropic). The application helps job seekers tailor their resumes to job descriptions while maintaining 100% factual accuracy through an evidence-based validation system.

## Development Commands

### Setup
```bash
# Install dependencies (uses pnpm)
pnpm install

# Setup database (SQLite)
npm run db:push

# Seed database with sample data (optional)
npm run db:seed
```

### Development
```bash
# Run development server (http://localhost:3000)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run tests
npm test

# Lint code
npm run lint

# Type check
npx tsc --noEmit
```

### Database Management
```bash
# Push schema changes to database
npm run db:push

# Generate Prisma client (runs automatically after npm install)
npx prisma generate

# Reset database
rm prisma/dev.db && npm run db:push
```

## Architecture

### Core Non-Hallucination System

The application's most critical feature is its evidence-based validation system that prevents AI hallucinations:

1. **Evidence Spans**: Every fact in generated resumes/cover letters includes character offsets (`start`, `end`) pointing to exact substrings in source documents (resume, job description, or extra info)
2. **Server-Side Validation**: `lib/utils/validation.ts` validates all evidence spans before returning results to the user
3. **Evidence Repair**: `tryRepairEvidenceSpans()` attempts to fix common model indexing mistakes by locating referenced text in source documents
4. **Structured Outputs**: Claude's tool use API enforces JSON schemas with required `evidence_spans` arrays

### LLM Integration (`lib/llm/client.ts`)

- **Model**: Claude Sonnet 4.5 (`claude-sonnet-4-5-20250929`)
- **Temperature**: 0.1 for consistency
- **Tool Use API**: Enforces structured JSON outputs with evidence citations
- **Three Main Methods**:
  - `extractKeyTerms(jd)`: Extracts 10-15 ATS keywords from job description
  - `generateTailoredResume(input)`: Creates ATS-optimized resume with evidence
  - `generateCoverLetter(input)`: Creates cover letter with evidence

### One-Page Optimization Strategy

The resume generation endpoint (`app/api/generate/resume/route.ts`) implements an aggressive multi-stage approach to ensure one-page output:

1. **Initial Generation**: Request one-page resume from Claude with `forceOnePage` flag and optional `hint`
2. **PDF Rendering Loop**: Render PDF and check page count using `pdf-parse`
3. **LLM Retry**: If > 1 page, ask Claude to condense (up to 3 attempts total)
4. **Deterministic Fallbacks** (if LLM attempts fail):
   - Font size reduction (9pt → 8pt)
   - Bullet removal (least JD-relevant bullets removed one-by-one)
   - Aggressive formatting (smaller padding, line height)
   - Bullet merging (combine two least-relevant bullets)
   - Section removal (remove low-scoring sections, prioritizing non-Experience)
5. **Validation After Each Step**: Ensure evidence spans remain valid after modifications

### Type System (`lib/types.ts`)

Key interfaces:
- `TailoredResume`: Complete resume structure with `sections[]`, contact info, `matched_term_count`
- `TailoredCoverLetter`: Letter with `paragraphs[]`, each containing `evidence_spans` and `matched_terms`
- `EvidenceSpan`: `{ source: 'resume' | 'jd' | 'extra', start: number, end: number }`
- `GenerateResumeInput`: Input for resume generation, includes `forceOnePage` and `hint` for retries

### Database Schema (`prisma/schema.prisma`)

Single `Session` model using SQLite:
- Stores raw inputs (`jdText`, `resumeText`, `extraText`)
- Stores ATS terms as JSON array (`terms`)
- Stores generated outputs as JSON (`resumeJson`, `letterJson`)
- Tracks ATS score (`atsScore`)

### API Routes

| Route | Purpose |
|-------|---------|
| `POST /api/session` | Create new session, returns `sessionId` |
| `POST /api/upload` | Upload PDF resume, parse text, return parsed content |
| `POST /api/generate/ats-terms` | Extract ATS keywords from job description |
| `POST /api/generate/resume` | Generate tailored resume (includes one-page optimization) |
| `POST /api/generate/cover-letter` | Generate tailored cover letter |
| `GET /api/download/resume` | Download resume as HTML for printing |
| `GET /api/download/cover-letter` | Download cover letter as HTML for printing |

### PDF Generation (`lib/utils/pdf-generator.tsx`)

Uses `@react-pdf/renderer` to create ATS-compliant PDFs:
- Single-column layout (critical for ATS parsing)
- Simple bullet points (no tables, text boxes, or multi-column designs)
- Configurable font sizes for one-page fitting
- Consistent date format: "Month YYYY - Month YYYY"

## Important Development Notes

### When Modifying Resume/Cover Letter Generation

1. **Always preserve evidence spans**: Any text manipulation must maintain valid `evidence_spans` arrays
2. **Run validation**: Use `validateTailoredResume()` or `validateTailoredCoverLetter()` after modifications
3. **Test one-page constraint**: Verify PDF renders to exactly 1 page
4. **Never fabricate data**: All content must trace back to source documents via evidence spans

### System Prompt Guidelines

The system prompt in `lib/llm/client.ts` (lines 14-88) is carefully tuned for:
- ATS compliance (single-column, standard headers, exact keyword matching)
- One-page optimization (750-850 words, prioritize JD-relevant content)
- Achievement-focused bullets (50%+ must have quantified metrics)
- Evidence-based accuracy (all facts cite character offsets)

When modifying prompts, maintain these constraints.

### Testing with Different LLMs

While the app is optimized for Claude Sonnet 4.5, the `LLMClient` class is designed to be provider-agnostic. The `.env` file supports `LLM_PROVIDER` configuration (though only Anthropic is currently implemented).

## Environment Variables

Required in `.env`:
```env
ANTHROPIC_API_KEY=sk-ant-...          # Claude API key
LLM_PROVIDER=anthropic                # LLM provider (currently only anthropic)
DATABASE_URL="file:./dev.db"          # SQLite database path
SESSION_SECRET=...                    # Session secret (generate with: openssl rand -base64 32)
```

## Common Workflows

### Adding a New Resume Section Type

1. Update `ResumeSection` type in `lib/types.ts`
2. Modify system prompt to instruct Claude on the new section
3. Update PDF renderer in `lib/utils/pdf-generator.tsx`
4. Test with validation to ensure evidence spans work correctly

### Debugging Evidence Span Errors

1. Check server logs for validation errors (printed to console)
2. Review `tryRepairEvidenceSpans()` logic in `lib/utils/validation.ts`
3. Verify source documents (resume, JD, extra) are correctly passed to validation
4. Ensure character offsets are 0-indexed and within bounds

### Modifying One-Page Optimization

The multi-stage fallback logic is in `app/api/generate/resume/route.ts` (lines 70-426). Stages are:
1. LLM retry loop (lines 86-152)
2. Font size reduction (lines 156-172)
3. Bullet removal (lines 174-249)
4. Aggressive formatting (lines 252-265)
5. Bullet merging (lines 268-342)
6. Section removal (lines 345-406)
7. Final padding reduction (lines 409-419)

To add new optimization strategies, insert between existing stages.
