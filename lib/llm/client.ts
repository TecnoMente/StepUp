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

CRITICAL: ABSOLUTE ONE-PAGE CONSTRAINT
**HARD LIMIT: 850 WORDS MAXIMUM (including all text)**
- You MUST count words before returning
- If over 850 words, you MUST remove content (oldest experience first)
- Summary should be 50-75 words MAX (or omit entirely)
- Recent roles: 3-5 bullets each
- Older roles (5+ years): 2-3 bullets or consolidate
- Very old roles (7+ years): remove entirely if space needed

CRITICAL ATS FORMATTING RULES:
1. ONE PAGE MAXIMUM - STRICTLY ENFORCED
   - Target: 750-850 words total
   - Prioritize recent (last 5-7 years) experience ONLY
   - Remove content from bottom up (oldest first) if over limit
   - Each bullet: 15-25 words max

2. ATS-FRIENDLY STRUCTURE:
   - Single column layout ONLY (no multi-column designs)
   - Standard section headers: "EXPERIENCE", "EDUCATION", "SKILLS", "PROJECTS"
   - Simple bullet points (use "•" character only)
   - NO tables, text boxes, columns, or special formatting
   - Font sizing implied: 10-12pt body, headers slightly larger
   - Consistent date format: "Month YYYY - Month YYYY" or "May 2025 - August 2025"

3. KEYWORD OPTIMIZATION (Primary ATS Scoring Factor):
   - Extract exact keywords from job description
   - Use keywords naturally in context (NO keyword stuffing)
   - Match job description terminology EXACTLY (capitalization, spelling)
   - If JD says "JavaScript" use "JavaScript" not "JS"
   - If JD says "CI/CD" use "CI/CD" not "continuous integration"
   - Place keywords in Skills section AND Experience bullets
   - Spell out acronyms on first use: "Continuous Integration/Continuous Deployment (CI/CD)"

4. ACHIEVEMENT-FOCUSED BULLETS (50% Must Have Metrics):
   - Start with action verbs: Developed, Implemented, Led, Optimized, Designed, Managed, Engineered
   - Include quantified results: numbers, percentages, dollar amounts, time savings
   - Format: "Action verb + task + keyword + measurable impact"
   - Example: "Implemented CI/CD pipeline using Jenkins, reducing deployment time from 2 hours to 15 minutes (87% faster)"
   - At least 50% of bullets MUST have quantified achievements
   - Bad: "Responsible for database management"
   - Good: "Optimized PostgreSQL database queries, reducing average response time by 60%"

5. CONTENT PRIORITIZATION ALGORITHM:
   - Most recent 5-7 years: detailed bullets (3-5 per role)
   - 5-7 years ago: condensed (2-3 bullets)
   - 7+ years ago: combine into one line OR remove entirely
   - If over 850 words: remove oldest content first, then reduce bullets on mid-tier roles

CRITICAL FACTUAL ACCURACY RULES:
1. Use ONLY evidence from the provided resume, job description, or extra information
2. Return JSON matching the schema exactly
3. For every bullet/sentence, include evidence_spans[] pointing to exact substrings in the inputs
4. NEVER invent employers, roles, dates, locations, credentials, or numbers
5. Reorder and rephrase for clarity and keyword alignment, but preserve all factual content
6. Evidence spans must reference character positions in the source text (start and end indices)

VALIDATION BEFORE RETURNING:
- Count total words across ALL fields
- If > 850 words: remove oldest content until under limit
- Verify 50%+ bullets have quantified metrics
- Confirm all facts have evidence spans

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
    return `I need you to create a STRICTLY ONE-PAGE, ATS-optimized resume tailored to this job description using ONLY the information provided below.

**Job Description:**
${input.jd}

**Current Resume:**
${input.resume}

${input.extra ? `**Additional Information:**\n${input.extra}\n` : ''}

**ATS Keywords to Incorporate (use exact spelling/capitalization):**
${input.terms.join(', ')}

**ABSOLUTE REQUIREMENTS - DO NOT DEVIATE:**

1. **HARD 850-WORD LIMIT (NON-NEGOTIABLE):**
   - Target: 750-850 words total (count ALL text)
   - Summary: 50-75 words MAX (or omit if space needed)
   - Each bullet: 15-25 words maximum
   - Recent roles (last 5 years): 3-5 bullets each
   - Mid-tier roles (5-7 years ago): 2-3 bullets each
   - Old roles (7+ years): REMOVE entirely or combine into one line
   - **BEFORE RETURNING: Count words. If >850, remove oldest content until under limit.**

2. **KEYWORD OPTIMIZATION (Primary ATS Factor):**
   - Use EXACT terminology from job description (match capitalization, spelling)
   - If JD says "JavaScript" → use "JavaScript" (NOT "JS", "Javascript", "java script")
   - If JD says "CI/CD pipelines" → use "CI/CD pipelines" (NOT "continuous integration")
   - Place keywords in: Skills section (most weighted) + Experience bullets (contextual proof)
   - Spell out acronyms on first use: "Application Programming Interface (API)"
   - NO keyword stuffing - must read naturally to humans

3. **ACHIEVEMENT-FOCUSED BULLETS (50% Must Have Metrics):**
   - START with action verbs: Engineered, Implemented, Developed, Led, Optimized, Designed, Managed, Built
   - INCLUDE quantified results: specific numbers, percentages, dollar amounts, time saved
   - FORMAT: "Action verb + what you did + keyword used + measurable impact"
   - GOOD: "Implemented CI/CD pipeline using Jenkins and Docker, reducing deployment time from 2 hours to 15 minutes (87% faster)"
   - BAD: "Responsible for improving deployment processes"
   - **REQUIREMENT: At least 50% of bullets MUST contain specific numbers/metrics**

4. **ATS-COMPLIANT FORMATTING:**
   - Section headers EXACTLY: "EDUCATION", "SKILLS", "EXPERIENCE", "PROJECTS"
   - Date format CONSISTENT: "Month YYYY - Month YYYY" (e.g., "May 2025 - August 2025")
   - Single column layout only (no tables, columns, text boxes)
   - Simple bullets: "•" character only
   - No special formatting (bold/italic handled in rendering)

5. **FACTUAL ACCURACY (ZERO FABRICATION):**
   - Extract candidate's full name from resume text
   - Use ONLY facts from provided documents
   - For EVERY bullet, cite evidence_spans with exact character offsets
   - NEVER invent: employers, roles, dates, locations, credentials, numbers, projects
   - If you can't find evidence for a claim, DON'T include it

6. **CONTENT PRIORITIZATION ALGORITHM:**
   - Focus HEAVILY on last 5-7 years (most recent experience)
   - Emphasize roles/projects that match job description keywords
   - Older experience (7+ years): combine or remove to stay under 850 words
   - Projects: only include if directly relevant to JD and space permits
   - Education: keep brief (one line if possible)

**VALIDATION CHECKLIST (before returning):**
✓ Total word count ≤ 850 words
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
    return `I need you to write a professional cover letter tailored to a job description using ONLY the information from the resume provided below. Follow all the critical rules in your system prompt.

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
