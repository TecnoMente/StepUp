'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { TailoredCoverLetter } from '@/lib/types';

function CoverLetterPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('sessionId');

  const [letter, setLetter] = useState<TailoredCoverLetter | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) {
      router.push('/');
      return;
    }

    // Fetch cover letter from session
    fetch(`/api/session/${sessionId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.letterJson) {
          setLetter(JSON.parse(data.letterJson));
        }
      })
      .catch((err) => console.error('Error fetching cover letter:', err))
      .finally(() => setIsLoading(false));
  }, [sessionId, router]);

  const handleDownloadLetter = () => {
    window.open(`/api/download/cover-letter?sessionId=${sessionId}`, '_blank');
  };

  if (isLoading) {
    return (
      <div className="container-custom py-12">
        <div className="text-center text-beige-50 text-xl">Loading...</div>
      </div>
    );
  }

  if (!letter) {
    return (
      <div className="container-custom py-12">
        <div className="text-center text-beige-50 text-xl">Cover letter not found</div>
      </div>
    );
  }

  return (
    <div className="container-custom py-12">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-serif font-bold text-beige-50 mb-3">
          Your Tailored Cover Letter is Ready.
        </h1>
        <p className="text-lg text-beige-50/90">
          Optimized for ATS. Editable before you apply.
        </p>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {/* Left: Cover Letter Preview */}
        <div className="lg:col-span-2 card-beige">
          <div className="max-h-[600px] overflow-y-auto prose prose-sm max-w-none">
            <div className="mb-6">{letter.salutation}</div>

            {letter.paragraphs.map((paragraph, idx) => (
              <p key={idx} className="mb-4 text-justify">
                {paragraph.text}
              </p>
            ))}

            <div className="mt-6 whitespace-pre-line">{letter.closing}</div>
          </div>

          {/* Button */}
          <div className="mt-6 pt-6 border-t border-ink-700/20">
            <button onClick={handleDownloadLetter} className="btn-primary w-full">
              Download Cover Letter (PDF)
            </button>
          </div>
        </div>

        {/* Right: ATS Alignment Panel */}
        <div className="card-beige">
          <h2 className="text-2xl font-serif font-bold mb-6 text-center">
            ATS Alignment
          </h2>

          {/* Circular Badge */}
          <div className="flex justify-center mb-8">
            <div className="w-40 h-40 rounded-full border-4 border-gold-300 flex flex-col items-center justify-center bg-beige-50">
              <div className="text-5xl font-bold text-ink-900">
                {letter.matched_term_count}
              </div>
              <div className="text-sm font-semibold text-ink-700 text-center">
                ATS Terms
                <br />
                Matched
              </div>
            </div>
          </div>

          {/* Checklist */}
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <svg
                className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5"
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
              <span className="text-ink-900">Matches job description keywords</span>
            </div>
            <div className="flex items-start gap-3">
              <svg
                className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5"
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
              <span className="text-ink-900">Professional tone and structure</span>
            </div>
            <div className="flex items-start gap-3">
              <svg
                className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5"
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
              <span className="text-ink-900">Saved to Application Tracker</span>
            </div>
          </div>

          {/* Tip */}
          <div className="mt-8 p-4 bg-gold-300/20 rounded-lg">
            <p className="text-sm text-ink-900 font-medium">
              Tip. You can edit this cover letter before saving.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CoverLetterPage() {
  return (
    <Suspense fallback={<div className="container-custom py-12 text-center text-beige-50">Loading...</div>}>
      <CoverLetterPageContent />
    </Suspense>
  );
}
