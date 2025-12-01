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
              <h3 className="text-lg font-semibold text-ink-900 mb-4">Original Resume</h3>
              <div className="bg-white rounded-lg shadow-lg p-6 overflow-auto min-h-0 flex-1">
                <pre className="whitespace-pre-wrap font-sans text-sm text-ink-900 leading-relaxed">
                  {originalResumeText}
                </pre>
              </div>
            </div>

            {/* Tailored Resume */}
            <div className="flex flex-col min-h-0">
              <h3 className="text-lg font-semibold text-ink-900 mb-4">Tailored Resume</h3>
              <div className="bg-white rounded-lg shadow-lg p-6 overflow-auto min-h-0 flex-1">
                {/* Resume Header */}
                <h2 className="text-2xl font-serif font-bold text-center mb-4 border-b-2 border-ink-900 pb-2">
                  {generatedResume.name.toUpperCase()}
                </h2>

                {/* Summary */}
                {generatedResume.summary && (
                  <div className="text-center mb-6 text-sm italic">
                    <p>{generatedResume.summary}</p>
                  </div>
                )}

                {/* Sections */}
                {generatedResume.sections.map((section, idx) => (
                  <div key={idx} className="mb-6">
                    <h3 className="text-lg font-bold border-b border-ink-700 mb-2">
                      {section.name.toUpperCase()}
                    </h3>
                    {section.items.map((item, itemIdx) => (
                      <div key={itemIdx} className="mb-4">
                        {item.title && (
                          <div className="flex justify-between items-start mb-1">
                            <div className="flex items-center gap-4 min-w-0 flex-1">
                              <strong className="font-semibold">{item.title}</strong>
                              {item.organization && (
                                <span className="text-ink-900 opacity-90">{item.organization}</span>
                              )}
                            </div>
                            <div className="text-sm italic text-ink-700 text-right whitespace-nowrap ml-4">
                              <div>{item.location}</div>
                              <div>{item.dateRange}</div>
                            </div>
                          </div>
                        )}

                        {item.bullets && (
                          <ul className="list-disc ml-6 text-sm space-y-1">
                            {item.bullets.map((bullet, bulletIdx) => (
                              <li key={bulletIdx}>{bullet.text}</li>
                            ))}
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
