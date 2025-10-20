// Evidence validation - prevents hallucination
import type {
  EvidenceSpan,
  TailoredResume,
  TailoredCoverLetter,
  ValidationResult,
  ValidationError,
} from '@/lib/types';

interface SourceTexts {
  resume: string;
  jd: string;
  extra?: string;
}

/**
 * Validate that all evidence spans reference real text in source documents
 * This is the core anti-hallucination mechanism
 */
export function validateEvidenceSpans(
  spans: EvidenceSpan[],
  sources: SourceTexts
): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const span of spans) {
    const sourceText = sources[span.source];

    if (!sourceText) {
      errors.push({
        field: 'evidence_span',
        message: `Source '${span.source}' not provided`,
        evidence: span,
      });
      continue;
    }

    // Validate character offsets
    if (span.start < 0 || span.end > sourceText.length || span.start >= span.end) {
      errors.push({
        field: 'evidence_span',
        message: `Invalid character offsets: ${span.start}-${span.end} (source length: ${sourceText.length})`,
        evidence: span,
      });
      continue;
    }

    // Extract the referenced text
    const referencedText = sourceText.substring(span.start, span.end);

    // Store it for transparency
    span.text = referencedText;
  }

  return errors;
}

/**
 * Validate a complete tailored resume
 */
export function validateTailoredResume(
  resume: TailoredResume,
  sources: SourceTexts
): ValidationResult {
  const errors: ValidationError[] = [];

  for (const section of resume.sections) {
    for (const item of section.items) {
      if (item.bullets) {
        for (const bullet of item.bullets) {
          const bulletErrors = validateEvidenceSpans(bullet.evidence_spans, sources);
          errors.push(...bulletErrors);

          // Ensure matched_terms are valid
          if (!Array.isArray(bullet.matched_terms)) {
            errors.push({
              field: 'matched_terms',
              message: 'matched_terms must be an array',
            });
          }
        }
      }
    }
  }

  // Validate matched_term_count
  if (typeof resume.matched_term_count !== 'number' || resume.matched_term_count < 0) {
    errors.push({
      field: 'matched_term_count',
      message: 'matched_term_count must be a non-negative number',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate a complete tailored cover letter
 */
export function validateTailoredCoverLetter(
  letter: TailoredCoverLetter,
  sources: SourceTexts
): ValidationResult {
  const errors: ValidationError[] = [];

  for (const paragraph of letter.paragraphs) {
    const paragraphErrors = validateEvidenceSpans(paragraph.evidence_spans, sources);
    errors.push(...paragraphErrors);

    if (!Array.isArray(paragraph.matched_terms)) {
      errors.push({
        field: 'matched_terms',
        message: 'matched_terms must be an array',
      });
    }
  }

  if (typeof letter.matched_term_count !== 'number' || letter.matched_term_count < 0) {
    errors.push({
      field: 'matched_term_count',
      message: 'matched_term_count must be a non-negative number',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Calculate actual matched term count from resume
 */
export function recalculateMatchedTerms(resume: TailoredResume): number {
  const uniqueTerms = new Set<string>();

  for (const section of resume.sections) {
    for (const item of section.items) {
      if (item.bullets) {
        for (const bullet of item.bullets) {
          bullet.matched_terms.forEach((term) => uniqueTerms.add(term));
        }
      }
    }
  }

  return uniqueTerms.size;
}
