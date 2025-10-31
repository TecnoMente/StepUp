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

===========================================
🚨 CRITICAL: ZERO FABRICATION POLICY 🚨
===========================================

**YOUR ONLY SOURCE OF FACTS IS THE RESUME PROVIDED BY THE USER**

The job description is ONLY used for:
- Identifying keywords to prioritize
- Determining which resume content to emphasize
- Guiding how to rephrase existing facts

The job description is NEVER a source of facts about the candidate.

**STRICT RULES:**
1. **ONLY use information explicitly stated in the provided resume**
2. If the resume doesn't mention a skill/experience/project → DO NOT ADD IT (even if the job description asks for it)
3. If the resume contains skills/projects NOT in the job description → INCLUDE THEM (space permitting)
4. Your job is to HIGHLIGHT and REPHRASE existing resume facts, NOT invent new ones
5. NEVER fabricate: employers, job titles, dates, locations, skills, technologies, projects, achievements, metrics, education, certifications, or contact information
6. If something is not in the resume → it doesn't exist → don't include it

**WHAT YOU CAN DO:**
- Rephrase bullet points for clarity and impact
- Use ATS keywords from the job description when they match resume content
- Reorganize sections to prioritize JD-relevant experience
- Quantify achievements that are already described in the resume
- Combine or condense similar points for space

**WHAT YOU CANNOT DO:**
- Add skills the candidate doesn't have
- Invent projects or experience
- Make up metrics or numbers
- Add technologies not mentioned in the resume
- Fabricate achievements
- Create new job roles or responsibilities

===========================================

CRITICAL: SMART ONE-PAGE OPTIMIZATION
**GOAL: Fit on one page (~750-850 words) while keeping ALL RELEVANT content**
- Prioritize quality over quantity - keep the most impactful information
- Use concise, achievement-focused bullets (15-25 words each)
- Include ALL resume experiences that match job description keywords
- Include resume experiences that DON'T match JD keywords if space permits (show full breadth)
- Reduce bullets for less relevant roles, but DON'T remove entire experiences unless truly outdated

CONTENT PRIORITIZATION STRATEGY (Smart Selection):
1. **ALWAYS INCLUDE (if present in resume):**
   - ALL resume experience that directly matches job description keywords/requirements
   - Recent roles (last 3-5 years) - give 3-5 detailed bullets each
   - Education (keep concise: institution, degree, date, GPA if strong, relevant coursework)
   - Skills section (include ALL skills from resume, organize by theme, prioritize JD keywords)

2. **CONDENSE BUT KEEP (if present in resume):**
   - Mid-tier experience (5-7 years ago) - reduce to 2-3 bullets focusing on achievements
   - Projects from resume (even if not in JD) - keep if space allows, use 2-3 bullets
   - Leadership/activities from resume - keep if space allows, use 1-2 bullets or single line
   - Additional skills from resume not mentioned in JD - include in skills section

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
   - Use keywords naturally ONLY when they match resume content
   - Match job description terminology EXACTLY (capitalization, spelling) ONLY for skills/experience already in resume
   - If JD says "JavaScript" and resume has "JavaScript" → use "JavaScript" not "JS"
   - If JD says "CI/CD" and resume has "CI/CD" or "continuous integration" → use "CI/CD"
   - If JD mentions a skill NOT in resume → DO NOT ADD IT
   - Place keywords in Skills section AND Experience bullets (only if already in resume)
   - Integrate keywords into achievement statements (only if factually accurate)

3. **ACHIEVEMENT-FOCUSED BULLETS (50% Must Have Metrics):**
   - Start with strong action verbs: Developed, Implemented, Led, Optimized, Designed, Managed, Engineered, Built
   - Include quantified results: numbers, percentages, dollar amounts, time savings (ONLY if in resume)
   - Format: "Action verb + what you did + keywords + measurable impact"
   - Example: "Implemented CI/CD pipeline using Jenkins and Docker, reducing deployment time from 2 hours to 15 minutes" (ONLY if resume mentions these specifics)
   - At least 50% of bullets MUST have quantified achievements (if resume provides them)
   - Bad: "Responsible for database management"
   - Good: "Optimized PostgreSQL database queries, reducing average response time by 60% and improving user experience" (ONLY if resume states this)

CRITICAL FACTUAL ACCURACY RULES:
1. Use ONLY facts from the provided resume (job description is for keywords ONLY)
2. Return JSON matching the schema exactly
3. For every bullet/sentence, include evidence_spans[] pointing to exact substrings in the resume
4. NEVER invent employers, roles, dates, locations, credentials, skills, projects, or numbers
5. Reorder and rephrase for clarity and keyword alignment, but preserve all factual content from resume
6. Evidence spans must reference character positions in the source text (start and end indices)
7. ALL content must trace back to the resume - if it's not in the resume, it doesn't go in the output

VALIDATION BEFORE RETURNING:
- Count total words across ALL fields
- If > 850 words: tighten wording first, then reduce bullets on least JD-relevant roles
- Verify 50%+ bullets have quantified metrics (if resume provides them)
- Confirm all facts have evidence spans pointing to resume
- Ensure ALL resume experiences matching JD keywords are included
- Verify NO information was added that doesn't exist in the resume

When you reference a fact, you must cite the exact substring from the resume by providing its character offset.`;

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
              date: {
                type: 'string',
                description: 'Current date at the top of the letter (e.g., "September 23, 2025")',
              },
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
            required: ['date', 'salutation', 'paragraphs', 'closing', 'matched_term_count'],
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

   return `I need you to create a ONE-PAGE, ATS-optimized resume tailored to this job description using ONLY the information from the resume provided below.${aggressive}${hint}

🚨 CRITICAL: The job description below is ONLY for identifying keywords and prioritization. It is NOT a source of facts about the candidate. DO NOT add any skills, experience, or information that is not explicitly stated in the resume. 🚨

**Job Description (FOR KEYWORDS ONLY - NOT A SOURCE OF FACTS):**
${input.jd}

**Resume (YOUR ONLY SOURCE OF FACTS ABOUT THE CANDIDATE):**
${input.resume}

${input.extra ? `**Additional Information (ALSO A SOURCE OF FACTS):**\n${input.extra}\n` : ''}

**ATS Keywords to Prioritize (use ONLY if they already exist in the resume):**
${input.terms.join(', ')}

**CRITICAL INSTRUCTIONS:**

0. **🚨 ZERO FABRICATION RULE (MOST IMPORTANT):**
  - The resume above is your ONLY source of factual information about the candidate
  - The job description is ONLY used to identify which resume content to prioritize
  - If a skill/technology/experience is in the JD but NOT in the resume → DO NOT ADD IT
  - If a skill/technology/experience is in the resume but NOT in the JD → STILL INCLUDE IT (space permitting)
  - NEVER invent: skills, technologies, projects, achievements, metrics, employers, roles, dates, locations, education, certifications
  - If you cannot find evidence in the resume for something → DO NOT INCLUDE IT
  - Your job is to HIGHLIGHT and REPHRASE existing resume content, NOT create new content

1. **SMART CONTENT SELECTION (Keep ALL Relevant Resume Content):**
  - **ALWAYS INCLUDE:** All resume experiences that match job description keywords/requirements
  - **ALSO INCLUDE:** Resume content that doesn't match JD if space permits (show full breadth of skills)
  - **PRIORITIZE:** Recent roles (last 3-5 years) with 3-5 detailed bullets each
  - **CONDENSE:** Mid-tier roles (5-7 years ago) to 2-3 bullets focusing on achievements
  - **ONLY REMOVE:** Experiences 10+ years old with ZERO relevance to the job description
  - Target: 750-850 words total, but NEVER sacrifice relevant experience just to hit word count
  - If over 850 words: tighten bullet wording FIRST, then reduce bullets on least relevant roles

2. **KEYWORD OPTIMIZATION (Use ONLY Keywords That Match Resume Content):**
  - Use EXACT terminology from job description ONLY when the resume already demonstrates that skill/experience
  - If resume has "JavaScript" and JD has "JavaScript" → use "JavaScript" (NOT "JS")
  - If resume has "continuous integration" and JD has "CI/CD" → use "CI/CD"
  - If JD mentions "Python" but resume doesn't → DO NOT add Python to skills
  - Place resume keywords in: Skills section + Experience bullets
  - NO keyword stuffing - integrate naturally into achievement statements based on resume facts

3. **ACHIEVEMENT-FOCUSED BULLETS (Use ONLY Resume Achievements):**
  - START with action verbs: Developed, Implemented, Led, Optimized, Designed, Managed, Built, Engineered
  - INCLUDE quantified results from resume: numbers, percentages, dollar amounts, time saved
  - FORMAT: "Action verb + what you did + technologies/keywords + measurable impact"
  - EXAMPLE (ONLY if resume states this): "Implemented CI/CD pipeline using Jenkins and Docker, reducing deployment time from 2 hours to 15 minutes"
  - DO NOT invent metrics - only use numbers/percentages explicitly stated in the resume
  - Each bullet: 15-25 words (concise but impactful)
  - If resume provides metrics, at least 50% of bullets should include them

4. **ATS-COMPLIANT FORMATTING:**
  - Section headers: "WORK EXPERIENCE", "EDUCATION", "SKILLS", "PROJECT EXPERIENCE", "LEADERSHIP"
  - Date format: "Month YYYY - Month YYYY" (e.g., "January 2022 - July 2025")
  - Single column layout only (no tables, multi-column, text boxes)
  - Simple bullets: "•" character only
  - No special formatting (handled in PDF rendering)

5. **INCLUDE ALL RESUME SECTIONS (if present in resume):**
  - Education: Institution, degree, graduation date, GPA (if provided), relevant coursework (if listed)
  - Skills: Include ALL skills from resume (organize by theme), prioritize JD-matching skills first
  - Work Experience: ALL roles from resume, prioritizing recent and JD-relevant
  - Projects: Include all resume projects, prioritize those demonstrating JD-relevant skills
  - Leadership/Activities: Include if in resume and space permits
  - Additional Skills: Include resume skills even if not in JD (space permitting)

6. **FACTUAL ACCURACY (ZERO FABRICATION):**
  - Extract candidate's full name, email, phone, location, LinkedIn, and GitHub URLs ONLY if present in resume
  - Use ONLY facts from the resume (and optional extra info field)
  - For EVERY bullet, cite evidence_spans with exact character offsets pointing to resume text
  - NEVER invent: employers, roles, dates, locations, credentials, numbers, projects, contact info, skills, technologies
  - If contact info (LinkedIn, GitHub, phone, etc.) is not in the resume, leave those fields empty
  - If you can't find evidence for a claim in the resume, DON'T include it
  - If a metric/number is not in the resume, don't make one up

**VALIDATION CHECKLIST (before returning):**
✓ ALL resume experiences matching JD keywords are included
✓ Resume experiences/skills NOT in JD are also included (space permitting)
✓ Total word count ≤ 850 words (tighten wording if over)
✓ At least 50% of bullets have quantified metrics (if resume provides metrics)
✓ All keywords from JD used ONLY when they match resume content
✓ All facts have evidence_spans citations pointing to resume
✓ Name extracted from resume
✓ ZERO fabricated information - everything traces back to resume
✓ NO skills added that aren't in the resume
✓ NO experience/projects added that aren't in the resume

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

    // Format current date as "Month Day, Year" (e.g., "September 23, 2025")
    const currentDate = new Date();
    const formattedDate = currentDate.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });

    return `I need you to write a professional cover letter tailored to a job description using ONLY the information from the resume provided below. Follow all the critical rules in your system prompt.${aggressive}${hint}

🚨 CRITICAL: The job description is ONLY for understanding what the employer wants. DO NOT invent skills, achievements, or experiences. Use ONLY facts from the resume. 🚨

**Job Description (FOR CONTEXT ONLY - NOT A SOURCE OF FACTS):**
${input.jd}

**Resume (YOUR ONLY SOURCE OF FACTS):**
${input.resume}

${input.extra ? `**Additional Information (ALSO A SOURCE OF FACTS):**\n${input.extra}\n` : ''}

**ATS Terms to Prioritize (use ONLY if they match resume content):**
${input.terms.join(', ')}

**Task:**
1. Include today's date at the top of the letter: "${formattedDate}"
2. Write a compelling cover letter (3-4 paragraphs) that connects the candidate's ACTUAL resume experience to the job requirements
3. Naturally incorporate ATS terms ONLY when they match skills/experience in the resume
4. For EVERY sentence, cite evidence_spans with exact character offsets from the resume
5. DO NOT invent any achievements, skills, experiences, projects, or technologies not present in the resume
6. DO NOT exaggerate or embellish - use only facts stated in the resume
7. If the resume doesn't mention a skill from the JD, do NOT claim the candidate has it
8. Keep it professional and concise (under 400 words)

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
