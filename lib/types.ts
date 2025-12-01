// Type definitions for StepUp ATS Resume Generator

export interface EvidenceSpan {
  source: 'resume' | 'jd' | 'extra';
  start: number;
  end: number;
  text?: string; // Optional: the actual matched text for validation
}

export interface ResumeBullet {
  text: string;
  evidence_spans: EvidenceSpan[];
  matched_terms: string[];
  change_rationale?: string; // Explanation for why this bullet was modified/reworded from original
}

export interface ResumeItem {
  title?: string;
  organization?: string;
  location?: string;
  dateRange?: string;
  bullets?: ResumeBullet[];
  title_rationale?: string; // Explanation for why title was modified
  organization_rationale?: string; // Explanation for why organization was modified
}

export interface ResumeSection {
  name: 'Education' | 'Experience' | 'Projects' | 'Skills' | string;
  items: ResumeItem[];
}

export interface TailoredResume {
  name: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  github?: string;
  summary?: string;
  summary_rationale?: string; // Explanation for why summary was modified
  sections: ResumeSection[];
  matched_term_count: number;
}

export interface CoverLetterParagraph {
  text: string;
  evidence_spans: EvidenceSpan[];
  matched_terms: string[];
}

export interface TailoredCoverLetter {
  date: string; // Formatted date at top of cover letter (e.g., "September 23, 2025")
  salutation: string;
  paragraphs: CoverLetterParagraph[];
  closing: string;
  matched_term_count: number;
}

export interface GenerateResumeInput {
  jd: string;
  resume: string;
  extra?: string;
  terms: string[];
  // If true, instruct the model to aggressively condense the result to fit a single page
  forceOnePage?: boolean;
  // Optional hint to the model (e.g., 'current output is 2 pages, please compress')
  hint?: string;
}

export interface GenerateCoverLetterInput {
  jd: string;
  resume: string;
  extra?: string;
  terms: string[];
  // Request to condense the letter to fit a single page
  forceOnePage?: boolean;
  // Optional hint for the model
  hint?: string;
}

export interface ValidationError {
  field: string;
  message: string;
  evidence?: EvidenceSpan;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}
