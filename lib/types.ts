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
}

export interface ResumeItem {
  title?: string;
  organization?: string;
  location?: string;
  dateRange?: string;
  bullets?: ResumeBullet[];
}

export interface ResumeSection {
  name: 'Education' | 'Experience' | 'Projects' | 'Skills' | string;
  items: ResumeItem[];
}

export interface TailoredResume {
  name: string;
  summary?: string;
  sections: ResumeSection[];
  matched_term_count: number;
}

export interface CoverLetterParagraph {
  text: string;
  evidence_spans: EvidenceSpan[];
  matched_terms: string[];
}

export interface TailoredCoverLetter {
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
}

export interface GenerateCoverLetterInput {
  jd: string;
  resume: string;
  extra?: string;
  terms: string[];
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
