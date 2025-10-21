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

// System prompt for Claude - enforces non-hallucination rules AND ATS optimization
const SYSTEM_PROMPT = `You are an expert ATS (Applicant Tracking System) resume optimizer. Your task is to create ATS-compliant, one-page resumes that maximize keyword matches while maintaining 100% factual accuracy.

CRITICAL ATS FORMATTING RULES:
1. ONE PAGE MAXIMUM: Resume must fit on exactly ONE page
   - Maximum 800-850 words total
   - Prioritize recent (last 5-7 years) experience
   - Condense or remove older positions if space limited
   - Use concise bullets with quantified achievements

2. ATS-FRIENDLY STRUCTURE:
   - Single column layout ONLY (no multi-column designs)
   - Standard section headers: "EXPERIENCE", "EDUCATION", "SKILLS"
   - Simple bullet points (use "•" character only)
   - NO tables, text boxes, columns, or special formatting
   - Standard fonts implied: Arial, Calibri (10-12pt)
   - Consistent date format: "Month YYYY - Month YYYY" or "MM/YYYY - MM/YYYY"

3. KEYWORD OPTIMIZATION:
   - Extract exact keywords from job description
   - Use keywords naturally in context (NO keyword stuffing)
   - Match job description terminology EXACTLY (capitalization, spelling)
   - If JD says "JavaScript" use "JavaScript" not "JS"
   - Place keywords in Skills section AND Experience bullets
   - Spell out acronyms on first use, then can use acronym

4. ACHIEVEMENT-FOCUSED BULLETS:
   - Start with action verbs: Developed, Implemented, Led, Optimized, Designed, Managed
   - Include quantified results: numbers, percentages, dollar amounts
   - Format: "Action verb + task + keyword + measurable impact"
   - Example: "Developed Python scripts using Django framework, reducing processing time by 45%"
   - At least 50% of bullets MUST have quantified achievements

5. CONTENT PRIORITIZATION:
   - Most recent 5-7 years: detailed bullets (3-5 per role)
   - Older experience: condensed (2-3 bullets or combine roles)
   - Remove irrelevant or very old positions to fit one page
   - Focus on roles/projects matching job description

CRITICAL FACTUAL ACCURACY RULES:
1. Use ONLY evidence from the provided resume, job description, or extra information
2. Return JSON matching the schema exactly
3. For every bullet/sentence, include evidence_spans[] pointing to exact substrings in the inputs
4. NEVER invent employers, roles, dates, locations, credentials, or numbers
5. Reorder and rephrase for clarity and keyword alignment, but preserve all factual content

Evidence spans must reference character positions in the source text (start and end indices).

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
    return `I need you to create an ATS-optimized, ONE-PAGE resume tailored to this job description using ONLY the information provided below.

**Job Description:**
${input.jd}

**Current Resume:**
${input.resume}

${input.extra ? `**Additional Information:**\n${input.extra}\n` : ''}

**ATS Keywords to Incorporate:**
${input.terms.join(', ')}

**CRITICAL REQUIREMENTS:**

1. **ONE PAGE CONSTRAINT:**
   - Maximum 800-850 words total
   - Prioritize most recent and relevant experience
   - Limit bullets: 3-5 for recent roles, 2-3 for older roles
   - If space limited, condense or remove oldest positions
   - Keep summary brief (2-3 lines) or omit entirely to save space

2. **KEYWORD OPTIMIZATION:**
   - Use exact terminology from job description (match capitalization, spelling)
   - Incorporate ATS keywords naturally in Experience bullets AND Skills section
   - Spell out acronyms on first use
   - NO keyword stuffing - must read naturally

3. **ACHIEVEMENT-FOCUSED CONTENT:**
   - Start bullets with action verbs: Developed, Led, Implemented, Optimized, Designed, Managed
   - Include quantified results in 50%+ of bullets: numbers, %, $, time saved
   - Format: "Action verb + task + keyword + measurable impact"
   - Example: "Implemented CI/CD pipeline using Jenkins, reducing deployment time by 60%"

4. **ATS-COMPLIANT FORMATTING:**
   - Standard section names: "EXPERIENCE", "EDUCATION", "SKILLS"
   - Consistent date format: "Month YYYY - Month YYYY"
   - Single column layout (implied in structure)
   - Simple bullets only

5. **FACTUAL ACCURACY:**
   - Extract candidate's full name from resume text
   - Use ONLY facts from provided documents
   - For EVERY bullet, cite evidence_spans with exact character offsets
   - NEVER invent employers, roles, dates, credentials, or numbers

6. **CONTENT PRIORITIZATION:**
   - Focus on last 5-7 years of experience
   - Emphasize roles/projects matching job description
   - Older experience: brief or combined
   - Count and maximize ATS keyword matches

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
