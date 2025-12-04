'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { TailoredCoverLetter } from '@/lib/types';
import ATSKeyTermsDropdown from '@/components/ATSKeyTermsDropdown';
import { getMatchedTermsFromCoverLetter } from '@/lib/utils/validation';

function CoverLetterPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('sessionId');

  const [letter, setLetter] = useState<TailoredCoverLetter | null>(null);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [position, setPosition] = useState<string | null>(null);
  const [allTerms, setAllTerms] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isGeneratingResume, setIsGeneratingResume] = useState(false);
  const [suggestions, setSuggestions] = useState('');
  const [isRegenerating, setIsRegenerating] = useState(false);

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
        setCompanyName(data.companyName || null);
        setPosition(data.position || null);
        if (data.terms) {
          setAllTerms(JSON.parse(data.terms));
        }
      })
      .catch((err) => console.error('Error fetching cover letter:', err))
      .finally(() => setIsLoading(false));
  }, [sessionId, router]);

  const handleDownloadLetter = async () => {
    try {
      // Always save current cover letter state before downloading
      if (letter) {
        const response = await fetch(`/api/session/${sessionId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ letterJson: JSON.stringify(letter) }),
        });

        if (!response.ok) {
          throw new Error('Failed to save cover letter');
        }

        // Wait a moment for database to commit
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      // Trigger download
      window.location.href = `/api/download/cover-letter?sessionId=${sessionId}`;
    } catch (error) {
      console.error('Error saving cover letter:', error);
      alert('Failed to save changes. Please try again.');
    }
  };

  const handleDownloadResume = async () => {
    setIsGeneratingResume(true);
    try {
      // First, check if resume already exists in session
      const sessionRes = await fetch(`/api/session/${sessionId}`);
      const sessionData = await sessionRes.json();

      // If no resume exists, generate it
      if (!sessionData.resumeJson) {
        const res = await fetch('/api/generate/resume', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        });
        if (!res.ok) throw new Error('Failed to generate resume');
      }

      // Navigate to resume page
      router.push(`/resume?sessionId=${sessionId}`);
    } catch (e) {
      console.error(e);
      alert('Failed to generate resume');
    } finally {
      setIsGeneratingResume(false);
    }
  };

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
  };

  const updateLetterField = (field: 'salutation' | 'closing', value: string) => {
    if (!letter) return;
    setLetter({ ...letter, [field]: value });
  };

  const updateParagraph = (index: number, value: string) => {
    if (!letter) return;
    const newParagraphs = [...letter.paragraphs];
    newParagraphs[index] = { ...newParagraphs[index], text: value };
    setLetter({ ...letter, paragraphs: newParagraphs });
  };

  const handleRegenerateCoverLetter = async () => {
    if (!suggestions.trim()) {
      alert('Please enter your suggestions before regenerating.');
      return;
    }

    setIsRegenerating(true);
    try {
      const res = await fetch('/api/generate/cover-letter/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          suggestions: suggestions.trim(),
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to regenerate cover letter');
      }

      const data = await res.json();
      // Update the letter state and reload the page to show fresh data
      setLetter(data.letter);
      setSuggestions('');

      // Reload the page to show the updated cover letter
      window.location.reload();
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : 'Failed to regenerate cover letter');
      setIsRegenerating(false);
    }
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
        {(companyName || position) && (
          <p className="text-xl text-beige-50/95 mb-2">
            {companyName && position ? `${companyName} - ${position}` : companyName || position}
          </p>
        )}
        <p className="text-lg text-beige-50/90">
          Optimized for ATS. Editable before you apply.
        </p>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {/* Left: Cover Letter Preview */}
        <div className="lg:col-span-2 card-beige">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-ink-900">Cover Letter Preview</h3>
            <button
              onClick={handleEditToggle}
              className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                isEditing
                  ? 'bg-gold-300 text-ink-900 hover:bg-gold-400'
                  : 'bg-beige-100 text-ink-900 hover:bg-beige-200'
              }`}
            >
              {isEditing ? 'Done Editing' : 'Edit Cover Letter'}
            </button>
          </div>
          <div className="max-h-[600px] overflow-y-auto">
            <div className="bg-white rounded-lg shadow-lg p-8 prose prose-sm max-w-none">
              <div className="mb-6 text-sm text-ink-700">
                {letter.date}
              </div>

              <div
                contentEditable={isEditing}
                suppressContentEditableWarning
                onBlur={(e) => updateLetterField('salutation', e.currentTarget.textContent || '')}
                className="mb-6 focus:outline-none focus:bg-beige-100 pr-8"
              >
                {letter.salutation}
              </div>

              {letter.paragraphs.map((paragraph, idx) => (
                <p
                  key={idx}
                  contentEditable={isEditing}
                  suppressContentEditableWarning
                  onBlur={(e) => updateParagraph(idx, e.currentTarget.textContent || '')}
                  className="mb-4 text-justify focus:outline-none focus:bg-beige-100 pr-8"
                >
                  {paragraph.text}
                </p>
              ))}

              <div
                contentEditable={isEditing}
                suppressContentEditableWarning
                onBlur={(e) => updateLetterField('closing', e.currentTarget.textContent || '')}
                className="mt-6 whitespace-pre-line focus:outline-none focus:bg-beige-100 pr-8"
              >
                {letter.closing}
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-4 mt-6 pt-6 border-t border-ink-700/20">
            <button onClick={handleDownloadLetter} className="btn-primary flex-1">
              Download Cover Letter (PDF)
            </button>
            <button onClick={handleDownloadResume} disabled={isGeneratingResume} className="btn-primary flex-1 disabled:opacity-50">
              {isGeneratingResume ? 'Generating Resume...' : 'Download Tailored Resume'}
            </button>
          </div>
        </div>

        {/* Right: ATS Alignment Panel */}
        <div className="card-beige">
          <h2 className="text-2xl font-serif font-bold mb-6 text-center">
            ATS Alignment
          </h2>

          {/* Key Terms Dropdown */}
          <div className="mb-8">
            <ATSKeyTermsDropdown
              allTerms={allTerms}
              matchedTerms={getMatchedTermsFromCoverLetter(letter)}
            />
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

          {/* Suggestion Section */}
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-ink-900 mb-3">Improve Your Cover Letter</h3>
            <p className="text-sm text-ink-700 mb-3">
              Have specific changes in mind? Enter your suggestions below and regenerate your cover letter.
            </p>
            <textarea
              value={suggestions}
              onChange={(e) => setSuggestions(e.target.value)}
              placeholder="E.g., Make it more compelling, emphasize specific achievements, adjust tone to be more formal..."
              className="w-full p-3 border border-ink-700/20 rounded-lg text-sm text-ink-900 placeholder-ink-700/50 focus:outline-none focus:ring-2 focus:ring-gold-300 min-h-[100px] resize-y"
              disabled={isRegenerating}
            />
            <button
              onClick={handleRegenerateCoverLetter}
              disabled={isRegenerating || !suggestions.trim()}
              className="btn-primary w-full mt-3 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isRegenerating && (
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {isRegenerating ? 'Regenerating Cover Letter...' : 'Regenerate Cover Letter'}
            </button>
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
