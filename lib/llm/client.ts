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

// System prompt for Claude - enforces non-hallucination rules
const SYSTEM_PROMPT = `You are an expert ATS resume optimizer. Your task is to tailor resumes and cover letters to job descriptions while maintaining 100% factual accuracy.

CRITICAL RULES:
1. Use ONLY evidence from the provided resume, job description, or extra information
2. Return JSON matching the schema exactly
3. For every bullet/sentence, include evidence_spans[] pointing to exact substrings in the inputs
4. NEVER invent employers, roles, dates, locations, credentials, or numbers
5. Maximize natural inclusion of ATS terms from the provided list
6. Keep language concise and professional; avoid buzzword stuffing
7. Reorder and rephrase for clarity and keyword alignment, but preserve all factual content

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
            required: ['sections', 'matched_term_count'],
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
    return `I need you to tailor a resume to match a job description using ONLY the information provided below. Follow all the critical rules in your system prompt.

**Job Description:**
${input.jd}

**Current Resume:**
${input.resume}

${input.extra ? `**Additional Information:**\n${input.extra}\n` : ''}

**ATS Terms to Prioritize:**
${input.terms.join(', ')}

**Task:**
1. Reorganize and optimize the resume sections to highlight relevant experience
2. Rewrite bullets to naturally incorporate ATS terms while keeping facts accurate
3. For EVERY bullet point, cite evidence_spans with exact character offsets from the source documents
4. DO NOT invent any new projects, roles, dates, or credentials
5. Count how many ATS terms were successfully incorporated

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
