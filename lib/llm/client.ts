// LLM Client Wrapper - Claude-optimized with provider-agnostic fallback
// Primary: Anthropic Claude API
// Fallback: OpenAI (optional)

import Anthropic from '@anthropic-ai/sdk';
import type {
  GenerateResumeInput,
  GenerateCoverLetterInput,
  TailoredResume,
  TailoredCoverLetter,
} from '@/lib/types';

// System prompt for Claude - enforces non-hallucination rules AND strict ATS optimization
const SYSTEM_PROMPT = `You are an expert ATS (Applicant Tracking System) resume optimizer. Your task is to create ATS-compliant, one-page resumes that maximize keyword matches while maintaining 100% factual accuracy.

CRITICAL: SMART ONE-PAGE OPTIMIZATION
**GOAL: Fit on one page (~750-850 words) while keeping ALL RELEVANT content**
- Prioritize quality over quantity - keep the most impactful information
- Use concise, achievement-focused bullets (15-25 words each)
- Include ALL experiences that match job description keywords
- Reduce bullets for less relevant roles, but DON'T remove entire experiences unless truly outdated

CONTENT PRIORITIZATION STRATEGY (Smart Selection):
1. **ALWAYS INCLUDE:**
   - ALL experience that directly matches job description keywords/requirements
   - Recent roles (last 3-5 years) - give 3-5 detailed bullets each
   - Education (keep concise: institution, degree, date, GPA if strong, relevant coursework)
   - Skills section (organize by theme, include ALL keywords from JD)

2. **CONDENSE BUT KEEP:**
   - Mid-tier experience (5-7 years ago) - reduce to 2-3 bullets focusing on achievements
   - Relevant projects (even if old) - keep if they match JD keywords, use 2-3 bullets
   - Leadership/activities - keep if relevant to role, use 1-2 bullets or single line

3. **ONLY REMOVE IF ABSOLUTELY NECESSARY:**
   - Experiences 10+ years old with NO relevance to current JD
   - Duplicate/redundant skills or experiences
   - Very brief roles (<3 months) with minimal impact

4. **WORD COUNT MANAGEMENT:**
   - Summary: 50-75 words MAX (or omit if space needed for experience)
   - Each bullet: 15-25 words (concise, impactful)
   - Target total: 750-850 words
   - If over 850 words: tighten bullet wording first, THEN reduce bullets on least relevant roles

CRITICAL ATS FORMATTING RULES:
1. **ATS-FRIENDLY STRUCTURE:**
   - Single column layout ONLY (no multi-column designs)
   - Standard section headers: "WORK EXPERIENCE", "EDUCATION", "SKILLS", "PROJECT EXPERIENCE", "LEADERSHIP"
   - Simple bullet points (use "•" character only)
   - NO tables, text boxes, columns, or special formatting
   - Font sizing implied: 10-12pt body, headers slightly larger
   - Consistent date format: "Month YYYY - Month YYYY" (e.g., "May 2025 - August 2025")

2. **KEYWORD OPTIMIZATION (Primary ATS Scoring Factor):**
   - Extract exact keywords from job description
   - Use keywords naturally in context (NO keyword stuffing)
   - Match job description terminology EXACTLY (capitalization, spelling)
   - If JD says "JavaScript" use "JavaScript" not "JS"
   - If JD says "CI/CD" use "CI/CD" not "continuous integration"
   - Place keywords in Skills section AND Experience bullets
   - Integrate keywords into achievement statements

3. **ACHIEVEMENT-FOCUSED BULLETS (50% Must Have Metrics):**
   - Start with strong action verbs: Developed, Implemented, Led, Optimized, Designed, Managed, Engineered, Built
   - Include quantified results: numbers, percentages, dollar amounts, time savings
   - Format: "Action verb + what you did + keywords + measurable impact"
   - Example: "Implemented CI/CD pipeline using Jenkins and Docker, reducing deployment time from 2 hours to 15 minutes"
   - At least 50% of bullets MUST have quantified achievements
   - Bad: "Responsible for database management"
   - Good: "Optimized PostgreSQL database queries, reducing average response time by 60% and improving user experience"

CRITICAL FACTUAL ACCURACY RULES:
1. Use ONLY evidence from the provided resume, job description, or extra information
2. Return JSON matching the schema exactly
3. For every bullet/sentence, include evidence_spans[] pointing to exact substrings in the inputs
4. NEVER invent employers, roles, dates, locations, credentials, or numbers
5. Reorder and rephrase for clarity and keyword alignment, but preserve all factual content
6. Evidence spans must reference character positions in the source text (start and end indices)

VALIDATION BEFORE RETURNING:
- Count total words across ALL fields
- If > 850 words: tighten wording first, then reduce bullets on least JD-relevant roles
- Verify 50%+ bullets have quantified metrics
- Confirm all facts have evidence spans
- Ensure ALL experiences matching JD keywords are included

When you reference a fact, you must cite the exact substring from one of the source documents by providing its character offset.`;

export class LLMClient {
  private client: Anthropic;
  private model: string;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is required');
    }

    this.client = new Anthropic({ apiKey });
    this.model = 'claude-sonnet-4-5-20250929';
  }

  /**
   * Generate a tailored resume using Claude's tool use API
   */
  async generateTailoredResume(input: GenerateResumeInput): Promise<TailoredResume> {
    const userPrompt = this.buildResumePrompt(input);

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 8192,
      temperature: 0.1,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      tools: [
        {
          name: 'generate_tailored_resume',
          description: 'Generate an ATS-optimized resume with evidence citations',
          input_schema: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Full name of the candidate (extract from the resume)',
              },
              email: {
                type: 'string',
                description: 'Email address (extract from the resume)',
              },
              phone: {
                type: 'string',
                description: 'Phone number (extract from the resume)',
              },
              location: {
                type: 'string',
                description: 'City and state location (extract from the resume)',
              },
              linkedin: {
                type: 'string',
                description: 'LinkedIn profile URL (extract from the resume if present, do not fabricate)',
              },
              github: {
                type: 'string',
                description: 'GitHub profile URL (extract from the resume if present, do not fabricate)',
              },
              summary: {
                type: 'string',
                description: 'Optional professional summary',
              },
              sections: {
                type: 'array',
                description: 'Resume sections (Education, Experience, Projects, Skills)',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    items: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          title: { type: 'string' },
                          organization: { type: 'string' },
                          location: { type: 'string' },
                          dateRange: { type: 'string' },
                          bullets: {
                            type: 'array',
                            items: {
                              type: 'object',
                              properties: {
                                text: { type: 'string' },
                                evidence_spans: {
                                  type: 'array',
                                  items: {
                                    type: 'object',
                                    properties: {
                                      source: {
                                        type: 'string',
                                        enum: ['resume', 'jd', 'extra'],
                                      },
                                      start: { type: 'number' },
                                      end: { type: 'number' },
                                    },
                                    required: ['source', 'start', 'end'],
                                  },
                                },
                                matched_terms: {
                                  type: 'array',
                                  items: { type: 'string' },
                                },
                              },
                              required: ['text', 'evidence_spans', 'matched_terms'],
                            },
                          },
                        },
                      },
                    },
                  },
                  required: ['name', 'items'],
                },
              },
              matched_term_count: {
                type: 'number',
                description: 'Total number of ATS terms matched',
              },
            },
            required: ['name', 'sections', 'matched_term_count'],
          },
        },
      ],
      tool_choice: { type: 'tool', name: 'generate_tailored_resume' },
    });

    // Extract tool use result
    const toolUse = response.content.find((block) => block.type === 'tool_use');
    if (!toolUse || toolUse.type !== 'tool_use') {
      throw new Error('Claude did not return a tool use response');
    }

    return toolUse.input as TailoredResume;
  }

  /**
   * Generate a tailored cover letter using Claude's tool use API
   */
  async generateCoverLetter(input: GenerateCoverLetterInput): Promise<TailoredCoverLetter> {
    const userPrompt = this.buildCoverLetterPrompt(input);

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      temperature: 0.1,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      tools: [
        {
          name: 'generate_cover_letter',
          description: 'Generate an ATS-optimized cover letter with evidence citations',
          input_schema: {
            type: 'object',
            properties: {
              salutation: {
                type: 'string',
                description: 'Opening salutation (e.g., "Dear Hiring Manager,")',
              },
              paragraphs: {
                type: 'array',
                description: 'Cover letter paragraphs with evidence',
                items: {
                  type: 'object',
                  properties: {
                    text: { type: 'string' },
                    evidence_spans: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          source: {
                            type: 'string',
                            enum: ['resume', 'jd', 'extra'],
                          },
                          start: { type: 'number' },
                          end: { type: 'number' },
                        },
                        required: ['source', 'start', 'end'],
                      },
                    },
                    matched_terms: {
                      type: 'array',
                      items: { type: 'string' },
                    },
                  },
                  required: ['text', 'evidence_spans', 'matched_terms'],
                },
              },
              closing: {
                type: 'string',
                description: 'Closing (e.g., "Sincerely,\\nJordan Patel")',
              },
              matched_term_count: {
                type: 'number',
                description: 'Total number of ATS terms matched',
              },
            },
            required: ['salutation', 'paragraphs', 'closing', 'matched_term_count'],
          },
        },
      ],
      tool_choice: { type: 'tool', name: 'generate_cover_letter' },
    });

    const toolUse = response.content.find((block) => block.type === 'tool_use');
    if (!toolUse || toolUse.type !== 'tool_use') {
      throw new Error('Claude did not return a tool use response');
    }

    return toolUse.input as TailoredCoverLetter;
  }

  /**
   * Extract key ATS terms from job description using Claude
   */
  async extractKeyTerms(jd: string): Promise<string[]> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 2048,
      temperature: 0,
      system:
        'You are an ATS keyword extraction expert. Extract the most important technical skills, qualifications, and key terms from job descriptions.',
      messages: [
        {
          role: 'user',
          content: `Extract 10-15 key ATS terms from this job description. Focus on:
- Technical skills and programming languages
- Tools and frameworks
- Qualifications and certifications
- Important soft skills
- Domain-specific terminology

Return ONLY a JSON array of strings, like: ["JavaScript", "React", "Problem-solving"]

Job Description:
${jd}`,
        },
      ],
    });

    const textBlock = response.content.find((block) => block.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('Claude did not return a text response');
    }

    // Parse JSON array from response
    const jsonMatch = textBlock.text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Could not extract JSON array from Claude response');
    }

    return JSON.parse(jsonMatch[0]) as string[];
  }

  /**
   * Build prompt for resume generation
   */
  private buildResumePrompt(input: GenerateResumeInput): string {
   const aggressive = input.forceOnePage
    ? '\n\n**AGGRESSIVE ONE-PAGE CONSTRAINT:** The previous attempt produced more than one page. Now CONDENSE aggressively: shorten bullets, remove the least JD-relevant bullets, and tighten wording while maintaining evidence spans and factual accuracy. Prioritize keeping JD-matching facts but shorten text to fit one page.'
    : '';

   const hint = input.hint ? `\n\nHINT FOR THIS ATTEMPT: ${input.hint}` : '';

   return `I need you to create a ONE-PAGE, ATS-optimized resume tailored to this job description using ONLY the information provided below.${aggressive}${hint}

**Job Description:**
${input.jd}

**Current Resume:**
${input.resume}

${input.extra ? `**Additional Information:**\n${input.extra}\n` : ''}

**ATS Keywords to Incorporate (use exact spelling/capitalization):**
${input.terms.join(', ')}

**CRITICAL INSTRUCTIONS:**

1. **SMART CONTENT SELECTION (Keep ALL Relevant Experience):**
  - **ALWAYS INCLUDE:** All experiences that match job description keywords/requirements
  - **PRIORITIZE:** Recent roles (last 3-5 years) with 3-5 detailed bullets each
  - **CONDENSE:** Mid-tier roles (5-7 years ago) to 2-3 bullets focusing on achievements
  - **ONLY REMOVE:** Experiences 10+ years old with ZERO relevance to the job description
  - Target: 750-850 words total, but NEVER sacrifice relevant experience just to hit word count
  - If over 850 words: tighten bullet wording FIRST, then reduce bullets on least relevant roles

2. **KEYWORD OPTIMIZATION (Critical for ATS):**
  - Use EXACT terminology from job description (match capitalization, spelling)
  - If JD says "JavaScript" → use "JavaScript" (NOT "JS", "Javascript", "java script")
  - If JD says "CI/CD" → use "CI/CD" (NOT "continuous integration")
  - Place keywords in: Skills section + Experience bullets (prove you used them)
  - NO keyword stuffing - integrate naturally into achievement statements

3. **ACHIEVEMENT-FOCUSED BULLETS (50% Must Have Metrics):**
  - START with action verbs: Developed, Implemented, Led, Optimized, Designed, Managed, Built, Engineered
  - INCLUDE quantified results: numbers, percentages, dollar amounts, time saved
  - FORMAT: "Action verb + what you did + technologies/keywords + measurable impact"
  - GOOD: "Implemented CI/CD pipeline using Jenkins and Docker, reducing deployment time from 2 hours to 15 minutes"
  - BAD: "Responsible for improving deployment processes"
  - Each bullet: 15-25 words (concise but impactful)
  - **REQUIREMENT: At least 50% of bullets MUST have specific numbers/metrics**

4. **ATS-COMPLIANT FORMATTING:**
  - Section headers: "WORK EXPERIENCE", "EDUCATION", "SKILLS", "PROJECT EXPERIENCE", "LEADERSHIP"
  - Date format: "Month YYYY - Month YYYY" (e.g., "January 2022 - July 2025")
  - Single column layout only (no tables, multi-column, text boxes)
  - Simple bullets: "•" character only
  - No special formatting (handled in PDF rendering)

5. **INCLUDE ALL IMPORTANT SECTIONS:**
  - Education: Institution, degree, graduation date, GPA (if strong), relevant coursework
  - Skills: Organize by theme (e.g., "Languages & Frameworks:", "DevOps & Cloud:")
  - Work Experience: ALL roles, prioritizing recent and JD-relevant
  - Projects: Include if they demonstrate JD-relevant skills
  - Leadership/Activities: Include if space permits and relevant

6. **FACTUAL ACCURACY (ZERO FABRICATION):**
  - Extract candidate's full name, email, phone, location, LinkedIn, and GitHub URLs ONLY if present in resume
  - Use ONLY facts from provided documents
  - For EVERY bullet, cite evidence_spans with exact character offsets
  - NEVER invent: employers, roles, dates, locations, credentials, numbers, projects, contact info
  - If contact info (LinkedIn, GitHub, phone, etc.) is not in the resume, leave those fields empty
  - If you can't find evidence for a claim, DON'T include it

**VALIDATION CHECKLIST (before returning):**
✓ ALL experiences matching JD keywords are included
✓ Total word count ≤ 850 words (tighten wording if over)
✓ At least 50% of bullets have quantified metrics
✓ All keywords from JD incorporated naturally
✓ All facts have evidence_spans citations
✓ Name extracted from resume
✓ No fabricated information

Use the generate_tailored_resume tool to return your result.`;
  }

  /**
   * Build prompt for cover letter generation
   */
  private buildCoverLetterPrompt(input: GenerateCoverLetterInput): string {
    const aggressive = input.forceOnePage
      ? '\n\n**AGGRESSIVE LENGTH CONSTRAINT:** Please condense to fit a single page while preserving factual accuracy and evidence spans. Shorten sentences and reduce paragraphs as necessary.'
      : '';

    const hint = input.hint ? `\n\nHINT FOR THIS ATTEMPT: ${input.hint}` : '';

    return `I need you to write a professional cover letter tailored to a job description using ONLY the information from the resume provided below. Follow all the critical rules in your system prompt.${aggressive}${hint}

**Job Description:**
${input.jd}

**Resume:**
${input.resume}

${input.extra ? `**Additional Information:**\n${input.extra}\n` : ''}

**ATS Terms to Prioritize:**
${input.terms.join(', ')}

**Task:**
1. Write a compelling cover letter (3-4 paragraphs) that connects the candidate's experience to the job requirements
2. Naturally incorporate ATS terms throughout
3. For EVERY sentence, cite evidence_spans with exact character offsets from the source documents
4. DO NOT invent any achievements, skills, or experiences not present in the resume
5. Keep it professional and concise (under 400 words)

Use the generate_cover_letter tool to return your result.`;
  }
}

// Singleton instance
let llmClient: LLMClient | null = null;

export function getLLMClient(): LLMClient {
  if (!llmClient) {
    llmClient = new LLMClient();
  }
  return llmClient;
}
