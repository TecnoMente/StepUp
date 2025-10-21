'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { TailoredResume } from '@/lib/types';

function ResumePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('sessionId');

  const [resume, setResume] = useState<TailoredResume | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingLetter, setIsGeneratingLetter] = useState(false);

  useEffect(() => {
    if (!sessionId) {
      router.push('/');
      return;
    }

    // Fetch resume from session
    fetch(`/api/session/${sessionId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.resumeJson) {
          setResume(JSON.parse(data.resumeJson));
        }
      })
      .catch((err) => console.error('Error fetching resume:', err))
      .finally(() => setIsLoading(false));
  }, [sessionId, router]);

  const handleDownloadResume = () => {
    window.open(`/api/download/resume?sessionId=${sessionId}`, '_blank');
  };

  const handleGenerateCoverLetter = async () => {
    setIsGeneratingLetter(true);
    try {
      const res = await fetch('/api/generate/cover-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });

      if (!res.ok) {
        throw new Error('Failed to generate cover letter');
      }

      router.push(`/cover-letter?sessionId=${sessionId}`);
    } catch (err) {
      console.error('Error:', err);
      alert('Failed to generate cover letter');
    } finally {
      setIsGeneratingLetter(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container-custom py-12">
        <div className="text-center text-beige-50 text-xl">Loading...</div>
      </div>
    );
  }

  if (!resume) {
    return (
      <div className="container-custom py-12">
        <div className="text-center text-beige-50 text-xl">Resume not found</div>
      </div>
    );
  }

  return (
    <div className="container-custom py-12">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-serif font-bold text-beige-50 mb-3">
          Your Tailored Resume is Ready.
        </h1>
        <p className="text-lg text-beige-50/90">
          Optimized for ATS. Editable before you apply.
        </p>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {/* Left: Resume Preview */}
        <div className="lg:col-span-2 card-beige">
          <div className="max-h-[600px] overflow-y-auto">
            <h2 className="text-2xl font-serif font-bold text-center mb-4 border-b-2 border-ink-900 pb-2">
              {resume.name.toUpperCase()}
            </h2>

            {resume.summary && (
              <p className="text-center mb-6 text-sm italic">{resume.summary}</p>
            )}

            {resume.sections.map((section, idx) => (
              <div key={idx} className="mb-6">
                <h3 className="text-lg font-bold border-b border-ink-700 mb-2">
                  {section.name.toUpperCase()}
                </h3>
                {section.items.map((item, itemIdx) => (
                  <div key={itemIdx} className="mb-4">
                    {item.title && (
                      <div className="flex justify-between mb-1">
                        <div>
                          <strong>{item.title}</strong>
                          {item.organization && ` • ${item.organization}`}
                        </div>
                        <div className="text-sm italic text-ink-700">
                          {item.location} {item.dateRange}
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

          {/* Buttons */}
          <div className="flex gap-4 mt-6 pt-6 border-t border-ink-700/20">
            <button onClick={handleDownloadResume} className="btn-primary flex-1">
              Download Resume (PDF)
            </button>
            <button
              onClick={handleGenerateCoverLetter}
              disabled={isGeneratingLetter}
              className="btn-primary flex-1 disabled:opacity-50"
            >
              {isGeneratingLetter ? 'Generating...' : 'Generate Tailored Cover Letter'}
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
                {resume.matched_term_count}
              </div>
              <div className="text-sm font-semibold text-ink-700 text-center">
                Key Terms
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
              <span className="text-ink-900">Sovimized Skills section</span>
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
              Tip. You can edit this resume before saving.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResumePage() {
  return (
    <Suspense fallback={<div className="container-custom py-12 text-center text-beige-50">Loading...</div>}>
      <ResumePageContent />
    </Suspense>
  );
}
