'use client';

import { useState } from 'react';

interface ATSKeyTermsDropdownProps {
  allTerms: string[];
  matchedTerms: string[];
}

export default function ATSKeyTermsDropdown({ allTerms, matchedTerms }: ATSKeyTermsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  const matchedCount = matchedTerms.length;
  const totalCount = allTerms.length;

  return (
    <div className="relative">
      {/* Button/Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2 p-4 bg-beige-50 rounded-lg border-2 border-gold-300 hover:bg-beige-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="text-3xl font-bold text-ink-900">
            {matchedCount}/{totalCount}
          </div>
          <div className="text-sm font-semibold text-ink-700">
            Key Terms
          </div>
        </div>

        <svg
          className={`w-5 h-5 text-ink-900 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Content */}
      {isOpen && (
        <div className="absolute z-10 mt-2 w-full bg-white rounded-lg shadow-lg border-2 border-gold-300 max-h-80 overflow-y-auto">
          <div className="p-4 space-y-2">
            {allTerms.map((term, index) => {
              const isMatched = matchedTerms.includes(term);

              return (
                <div
                  key={index}
                  className={`flex items-center gap-3 p-2 rounded ${
                    isMatched ? 'bg-green-50' : 'bg-gray-50'
                  }`}
                >
                  {/* Checkmark */}
                  {isMatched ? (
                    <svg
                      className="w-5 h-5 text-green-600 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-5 h-5 text-gray-400 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <circle cx="12" cy="12" r="9" strokeWidth={2} />
                    </svg>
                  )}

                  {/* Term Text */}
                  <span
                    className={`text-sm font-medium ${
                      isMatched ? 'text-green-900' : 'text-gray-600'
                    }`}
                  >
                    {term}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
