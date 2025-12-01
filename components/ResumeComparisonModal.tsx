'use client';

import { useEffect } from 'react';
import type { TailoredResume } from '@/lib/types';

interface ResumeComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalResumeText: string;
  generatedResume: TailoredResume;
}

export default function ResumeComparisonModal({
  isOpen,
  onClose,
  originalResumeText,
  generatedResume,
}: ResumeComparisonModalProps) {
  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Helper function to check if text appears in original resume (with stricter matching)
  const isTextInOriginal = (text: string): boolean => {
    if (!text) return true;

    // First check: exact substring match (case-insensitive)
    // This catches unchanged titles, organizations, etc.
    if (originalResumeText.toLowerCase().includes(text.toLowerCase().trim())) {
      return true;
    }

    const normalizedText = text.toLowerCase().replace(/[^\w\s]/g, '').trim();
    const normalizedOriginal = originalResumeText.toLowerCase().replace(/[^\w\s]/g, '');

    // Second check: normalized exact match
    if (normalizedOriginal.includes(normalizedText)) {
      return true;
    }

    // Check if at least 85% of the words appear in sequence in the original
    const words = normalizedText.split(/\s+/);
    if (words.length === 0) return true;

    // For short texts (< 4 words), we already checked exact match above, so this is changed
    if (words.length < 4) {
      return false;
    }

    // For longer texts, check if significant portion exists (stricter: 85%)
    const windowSize = Math.max(4, Math.floor(words.length * 0.85));
    for (let i = 0; i <= words.length - windowSize; i++) {
      const window = words.slice(i, i + windowSize).join(' ');
      if (normalizedOriginal.includes(window)) {
        return true;
      }
    }
    return false;
  };

  // Helper function to check if original text appears in tailored resume (even if modified)
  const isOriginalTextInTailored = (text: string): boolean => {
    if (!text || text.trim().length < 10) return true; // Skip very short lines
    const normalizedText = text.toLowerCase().replace(/[^\w\s]/g, '').trim();

    // Build normalized version of tailored resume
    const tailoredText: string[] = [];

    // Add summary
    if (generatedResume.summary) {
      tailoredText.push(generatedResume.summary);
    }

    // Add all content from sections
    generatedResume.sections.forEach(section => {
      section.items.forEach(item => {
        if (item.title) tailoredText.push(item.title);
        if (item.organization) tailoredText.push(item.organization);
        if (item.bullets) {
          item.bullets.forEach(bullet => tailoredText.push(bullet.text));
        }
      });
    });

    const normalizedTailored = tailoredText.join(' ').toLowerCase().replace(/[^\w\s]/g, '');

    const words = normalizedText.split(/\s+/);
    if (words.length < 4) return true; // Skip very short content

    // Check if at least 50% of content appears (lenient check for modified versions)
    // This catches both exact matches AND reworded versions
    const windowSize = Math.max(3, Math.floor(words.length * 0.5));
    for (let i = 0; i <= words.length - windowSize; i++) {
      const window = words.slice(i, i + windowSize).join(' ');
      if (normalizedTailored.includes(window)) {
        return true;
      }
    }

    // Also check if any significant keywords (4+ chars) appear in sequence
    const significantWords = words.filter(w => w.length >= 4);
    if (significantWords.length >= 3) {
      // Check if at least 3 consecutive significant words appear together
      for (let i = 0; i <= significantWords.length - 3; i++) {
        const keywordWindow = significantWords.slice(i, i + 3).join(' ');
        if (normalizedTailored.includes(keywordWindow)) {
          return true;
        }
      }
    }

    return false;
  };

  // Parse original resume into lines with highlighting info
  const getOriginalResumeLines = () => {
    const lines = originalResumeText.split('\n');
    return lines.map((line, idx) => {
      const trimmed = line.trim();

      // Skip contact information lines (typically in first 10 lines)
      const isContactInfo = idx < 10 && (
        // Email pattern
        /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/.test(trimmed) ||
        // Phone pattern
        /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/.test(trimmed) ||
        /\(\d{3}\)\s*\d{3}[-.]?\d{4}/.test(trimmed) ||
        // LinkedIn/GitHub pattern
        /(linkedin\.com|github\.com)/i.test(trimmed) ||
        // Bullet separator pattern (likely contact line)
        /•/.test(trimmed) && trimmed.length < 100 ||
        // Name line (all caps, short, no special chars)
        /^[A-Z\s]{2,30}$/.test(trimmed) && trimmed.length < 40
      );

      if (isContactInfo) {
        return { text: line, isFiltered: false };
      }

      // Check if line looks like a bullet point or significant content
      const isBullet = /^[-•*▪︎·○●]\s/.test(trimmed) || /^\d+\.\s/.test(trimmed);
      const isSignificant = trimmed.length > 20;

      const isFiltered = (isBullet || isSignificant) && !isOriginalTextInTailored(trimmed);

      return { text: line, isFiltered };
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-beige-50 rounded-lg shadow-2xl w-[95vw] flex flex-col"
        style={{ height: '90vh', maxHeight: '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-ink-700/20 flex-shrink-0">
          <h2 className="text-2xl font-serif font-bold text-ink-900">Resume Comparison</h2>
          <button
            onClick={onClose}
            className="text-ink-700 hover:text-ink-900 transition-colors"
            aria-label="Close modal"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 min-h-0">
          <div className="grid grid-cols-2 gap-6 h-full">
            {/* Original Resume */}
            <div className="flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-ink-900">Original Resume</h3>
                <div className="flex items-center gap-2 text-xs text-ink-700">
                  <span className="bg-orange-200 px-2 py-1 rounded">Filtered out</span>
                  <span>from tailored resume</span>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-lg p-6 overflow-auto min-h-0 flex-1">
                <pre className="whitespace-pre-wrap font-sans text-sm text-ink-900 leading-relaxed">
                  {getOriginalResumeLines().map((line, idx) => (
                    <span
                      key={idx}
                      className={line.isFiltered ? 'bg-orange-200 block' : 'block'}
                      title={line.isFiltered ? 'Filtered out from tailored resume' : ''}
                    >
                      {line.text}
                      {'\n'}
                    </span>
                  ))}
                </pre>
              </div>
            </div>

            {/* Tailored Resume */}
            <div className="flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-ink-900">Tailored Resume</h3>
                <div className="flex items-center gap-2 text-xs text-ink-700">
                  <span className="bg-yellow-100 px-2 py-1 rounded">Changed</span>
                  <span>(hover for reason)</span>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-lg p-6 overflow-auto min-h-0 flex-1" style={{ fontFamily: 'Helvetica, Arial, sans-serif', fontSize: '10pt', lineHeight: '1.15' }}>
                {/* Name - centered, bold, uppercase with letter spacing */}
                <h2 className="text-center font-bold mb-1.5" style={{ fontSize: '16pt', letterSpacing: '0.5px' }}>
                  {generatedResume.name.toUpperCase()}
                </h2>

                {/* Contact Info - centered with bullet separators and bottom border */}
                <div className="text-center mb-1.5 pb-1.5 border-b-2 border-black" style={{ fontSize: '10pt' }}>
                  {generatedResume.email && <span>{generatedResume.email}</span>}
                  {generatedResume.email && generatedResume.phone && <span> • </span>}
                  {generatedResume.phone && <span>{generatedResume.phone}</span>}
                  {generatedResume.phone && generatedResume.location && <span> • </span>}
                  {generatedResume.location && <span>{generatedResume.location}</span>}
                  {generatedResume.location && generatedResume.linkedin && <span> • </span>}
                  {generatedResume.linkedin && (
                    <a href={generatedResume.linkedin.startsWith('http') ? generatedResume.linkedin : `https://${generatedResume.linkedin}`} className="text-black no-underline">
                      {generatedResume.linkedin.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                    </a>
                  )}
                  {generatedResume.linkedin && generatedResume.github && <span> • </span>}
                  {generatedResume.github && (
                    <a href={generatedResume.github.startsWith('http') ? generatedResume.github : `https://${generatedResume.github}`} className="text-black no-underline">
                      {generatedResume.github.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                    </a>
                  )}
                </div>

                {/* Sections */}
                {generatedResume.sections.map((section, idx) => (
                  <div key={idx} className="mb-1.5">
                    {/* Section Title - uppercase, bold, bottom border */}
                    <h3 className="font-bold border-b border-black mb-0.5 pb-0.5" style={{ fontSize: '11pt' }}>
                      {section.name.toUpperCase()}
                    </h3>
                    {section.items.map((item, itemIdx) => (
                      <div key={itemIdx} className="mb-1">
                        {item.title && (
                          <div className="mb-0.5">
                            {/* First line: Organization (bold) on left, Location on right */}
                            <div className="flex justify-between items-start mb-0">
                              <strong
                                className={`font-bold ${item.organization_rationale ? 'bg-yellow-100 px-1 rounded' : ''}`}
                                title={item.organization_rationale ? `Changed: ${item.organization_rationale}` : ''}
                              >
                                {item.organization || item.title}
                              </strong>
                              {item.location && <span className="text-right">{item.location}</span>}
                            </div>
                            {/* Second line: Title (italic) on left, Date (italic) on right */}
                            {item.organization && item.title && (
                              <div className="flex justify-between items-start">
                                <span
                                  className={`italic ${item.title_rationale ? 'bg-yellow-100 px-1 rounded' : ''}`}
                                  title={item.title_rationale ? `Changed: ${item.title_rationale}` : ''}
                                >
                                  {item.title}
                                </span>
                                {item.dateRange && <span className="italic text-right">{item.dateRange}</span>}
                              </div>
                            )}
                            {/* If no organization, show date on first line */}
                            {!item.organization && item.dateRange && (
                              <div className="flex justify-between items-start">
                                <span></span>
                                <span className="italic text-right">{item.dateRange}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Bullets with proper indentation */}
                        {item.bullets && (
                          <ul className="ml-4.5 mt-0.5" style={{ paddingLeft: '18px', listStyleType: 'disc' }}>
                            {item.bullets.map((bullet, bulletIdx) => {
                              // Only highlight if there's an actual rationale provided
                              const shouldHighlight = Boolean(bullet.change_rationale);
                              return (
                                <li
                                  key={bulletIdx}
                                  className={`mb-0.5 ${shouldHighlight ? 'bg-yellow-100 px-1 rounded' : ''}`}
                                  title={bullet.change_rationale ? `Changed: ${bullet.change_rationale}` : ''}
                                  style={{ lineHeight: '1.15' }}
                                >
                                  {bullet.text}
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-ink-700/20 flex-shrink-0">
          <button onClick={onClose} className="btn-primary">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
