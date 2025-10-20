// PDF parsing utilities using pdf-parse
import pdf from 'pdf-parse';

/**
 * Parse PDF buffer to text
 * Normalizes unicode and preserves structure
 */
export async function parsePDFToText(buffer: Buffer): Promise<string> {
  try {
    const data = await pdf(buffer);

    // Normalize unicode characters
    let text = data.text;
    text = text.normalize('NFKD');

    // Clean up excessive whitespace while preserving line breaks
    text = text.replace(/[ \t]+/g, ' ');
    text = text.replace(/\n{3,}/g, '\n\n');

    return text.trim();
  } catch (error) {
    console.error('PDF parsing error:', error);
    throw new Error('Failed to parse PDF file. Please ensure it is a valid PDF document.');
  }
}

/**
 * Validate PDF file
 */
export function validatePDFFile(file: File): { valid: boolean; error?: string } {
  // Check file type
  if (!file.type.includes('pdf') && !file.name.endsWith('.pdf')) {
    return { valid: false, error: 'File must be a PDF document' };
  }

  // Check file size (max 10MB)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    return { valid: false, error: 'PDF file must be smaller than 10MB' };
  }

  return { valid: true };
}

/**
 * Convert File to Buffer for server-side processing
 */
export async function fileToBuffer(file: File): Promise<Buffer> {
  const arrayBuffer = await file.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
