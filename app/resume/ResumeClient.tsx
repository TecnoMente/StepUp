'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { TailoredResume } from '@/lib/types';
import ATSKeyTermsDropdown from '@/components/ATSKeyTermsDropdown';
import ResumeComparisonModal from '@/components/ResumeComparisonModal';
import { getMatchedTermsFromResume } from '@/lib/utils/validation';

export default function ResumeClient({ sessionId }: { sessionId: string | null }) {
  const router = useRouter();

  const [resume, setResume] = useState<TailoredResume | null>(null);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [position, setPosition] = useState<string | null>(null);
  const [allTerms, setAllTerms] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingLetter, setIsGeneratingLetter] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [originalResumeText, setOriginalResumeText] = useState<string>('');
  const [suggestions, setSuggestions] = useState('');
  const [isRegenerating, setIsRegenerating] = useState(false);

  useEffect(() => {
    if (!sessionId) {
      router.push('/');
      return;
    }

    fetch(`/api/session/${sessionId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.resumeJson) setResume(JSON.parse(data.resumeJson));
        setCompanyName(data.companyName || null);
        setPosition(data.position || null);
        if (data.terms) setAllTerms(JSON.parse(data.terms));
        if (data.resumeText) setOriginalResumeText(data.resumeText);
      })
      .catch((err) => console.error('Error fetching resume:', err))
      .finally(() => setIsLoading(false));
  }, [sessionId, router]);

  const handleDownloadResume = async () => {
    try {
      if (resume) {
        const response = await fetch(`/api/session/${sessionId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resumeJson: JSON.stringify(resume) }),
        });
        if (!response.ok) throw new Error('Failed to save resume');
        await new Promise((r) => setTimeout(r, 300));
      }
      window.location.href = `/api/download/resume?sessionId=${sessionId}`;
    } catch (e) {
      console.error(e);
      alert('Failed to save changes. Please try again.');
    }
  };

  const handleGenerateCoverLetter = async () => {
    setIsGeneratingLetter(true);
    try {
      const res = await fetch('/api/generate/cover-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
      if (!res.ok) throw new Error('Failed to generate cover letter');
      router.push(`/cover-letter?sessionId=${sessionId}`);
    } catch (e) {
      console.error(e);
      alert('Failed to generate cover letter');
    } finally {
      setIsGeneratingLetter(false);
    }
  };

  const handleRegenerateResume = async () => {
    if (!suggestions.trim()) {
      alert('Please enter your suggestions before regenerating.');
      return;
    }

    setIsRegenerating(true);
    try {
      const res = await fetch('/api/generate/resume/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          suggestions: suggestions.trim()
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to regenerate resume');
      }

      const data = await res.json();
      // Update the resume state and reload the page to show fresh data
      setResume(data.resume);
      setSuggestions('');

      // Reload the page to show the updated resume
      window.location.reload();
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : 'Failed to regenerate resume');
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

  if (!resume) {
    return (
      <div className="container-custom py-12">
        <div className="text-center text-beige-50 text-xl">Resume not found</div>
      </div>
    );
  }

  return (
    <div className="container-custom py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-serif font-bold text-beige-50 mb-3">
          Your Tailored Resume is Ready.
        </h1>
        {(companyName || position) && (
          <p className="text-xl text-beige-50/95 mb-2">
            {companyName && position ? `${companyName} - ${position}` : companyName || position}
          </p>
        )}
        <p className="text-lg text-beige-50/90">Optimized for ATS. Editable before you apply.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
        <div className="lg:col-span-2 card-beige">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-ink-900">Resume Preview</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-4 py-2 rounded text-sm font-medium transition-colors bg-beige-100 text-ink-900 hover:bg-beige-200"
              >
                View Original
              </button>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                  isEditing ? 'bg-gold-300 text-ink-900 hover:bg-gold-400' : 'bg-beige-100 text-ink-900 hover:bg-beige-200'
                }`}
              >
                {isEditing ? 'Done Editing' : 'Edit Resume'}
              </button>
            </div>
          </div>

          <div className="max-h-[600px] overflow-y-auto">
            <div className="bg-white rounded-lg shadow-lg p-8 max-w-none">
              <h2 className="text-2xl font-serif font-bold text-center mb-4 border-b-2 border-ink-900 pb-2 pr-8">
                {isEditing ? (
                  <input
                    type="text"
                    value={resume.name}
                    onChange={(e) => setResume({ ...resume, name: e.target.value })}
                    className="w-full text-center bg-yellow-50 border border-gold-300 rounded px-2 py-1"
                  />
                ) : (
                  resume.name.toUpperCase()
                )}
              </h2>

              {resume.summary && (
                <div className="text-center mb-6 text-sm italic pr-8">
                  {isEditing ? (
                    <textarea
                      value={resume.summary}
                      onChange={(e) => setResume({ ...resume, summary: e.target.value })}
                      className="w-full bg-yellow-50 border border-gold-300 rounded px-2 py-1 min-h-[60px]"
                    />
                  ) : (
                    <p>{resume.summary}</p>
                  )}
                </div>
              )}

              {resume.sections.map((section, idx) => (
                <div key={idx} className="mb-6">
                  <h3 className="text-lg font-bold border-b border-ink-700 mb-2">
                    {isEditing ? (
                      <input
                        type="text"
                        value={section.name}
                        onChange={(e) => {
                          const newSections = [...resume.sections];
                          newSections[idx] = { ...newSections[idx], name: e.target.value };
                          setResume({ ...resume, sections: newSections });
                        }}
                        className="bg-yellow-50 border border-gold-300 rounded px-2 py-1 w-full"
                      />
                    ) : (
                      section.name.toUpperCase()
                    )}
                  </h3>
                  {section.items.map((item, itemIdx) => (
                    <div key={itemIdx} className="mb-4">
                      {item.title && (
                        <div className="flex justify-between items-start mb-1">
                          <div className="flex items-center gap-4 min-w-0 flex-1">
                            {isEditing ? (
                              <>
                                <input
                                  type="text"
                                  value={item.title}
                                  onChange={(e) => {
                                    const newSections = [...resume.sections];
                                    newSections[idx].items[itemIdx].title = e.target.value;
                                    setResume({ ...resume, sections: newSections });
                                  }}
                                  className="bg-yellow-50 border border-gold-300 rounded px-2 py-1 font-semibold flex-1"
                                />
                                {item.organization && (
                                  <input
                                    type="text"
                                    value={item.organization}
                                    onChange={(e) => {
                                      const newSections = [...resume.sections];
                                      newSections[idx].items[itemIdx].organization = e.target.value;
                                      setResume({ ...resume, sections: newSections });
                                    }}
                                    className="bg-yellow-50 border border-gold-300 rounded px-2 py-1 flex-1"
                                  />
                                )}
                              </>
                            ) : (
                              <>
                                <strong className="truncate font-semibold">{item.title}</strong>
                                {item.organization && (
                                  <span className="text-ink-900 truncate opacity-90">{item.organization}</span>
                                )}
                              </>
                            )}
                          </div>
                          <div className="text-sm italic text-ink-700 text-right whitespace-nowrap ml-4">
                            {isEditing ? (
                              <>
                                <input
                                  type="text"
                                  value={item.location || ''}
                                  onChange={(e) => {
                                    const newSections = [...resume.sections];
                                    newSections[idx].items[itemIdx].location = e.target.value;
                                    setResume({ ...resume, sections: newSections });
                                  }}
                                  className="bg-yellow-50 border border-gold-300 rounded px-2 py-1 text-xs mb-1 w-32"
                                  placeholder="Location"
                                />
                                <input
                                  type="text"
                                  value={item.dateRange || ''}
                                  onChange={(e) => {
                                    const newSections = [...resume.sections];
                                    newSections[idx].items[itemIdx].dateRange = e.target.value;
                                    setResume({ ...resume, sections: newSections });
                                  }}
                                  className="bg-yellow-50 border border-gold-300 rounded px-2 py-1 text-xs w-32"
                                  placeholder="Date Range"
                                />
                              </>
                            ) : (
                              <>
                                <div>{item.location}</div>
                                <div>{item.dateRange}</div>
                              </>
                            )}
                          </div>
                        </div>
                      )}

                      {item.bullets && (
                        <ul className="list-disc ml-6 text-sm space-y-1 pr-8">
                          {item.bullets.map((bullet, bulletIdx) => (
                            <li key={bulletIdx}>
                              {isEditing ? (
                                <textarea
                                  value={bullet.text}
                                  onChange={(e) => {
                                    const newSections = [...resume.sections];
                                    newSections[idx].items[itemIdx].bullets![bulletIdx].text = e.target.value;
                                    setResume({ ...resume, sections: newSections });
                                  }}
                                  className="w-full bg-yellow-50 border border-gold-300 rounded px-2 py-1 min-h-[40px]"
                                />
                              ) : (
                                bullet.text
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-4 mt-6 pt-6 border-t border-ink-700/20">
            <button onClick={handleDownloadResume} className="btn-primary flex-1">
              Download Resume (PDF)
            </button>
            <button onClick={handleGenerateCoverLetter} disabled={isGeneratingLetter} className="btn-primary flex-1 disabled:opacity-50">
              {isGeneratingLetter ? 'Generating...' : 'Generate Tailored Cover Letter'}
            </button>
          </div>
        </div>

        <div className="card-beige">
          <h2 className="text-2xl font-serif font-bold mb-6 text-center">ATS Alignment</h2>

          <div className="mb-8">
            <ATSKeyTermsDropdown
              allTerms={allTerms}
              matchedTerms={getMatchedTermsFromResume(resume)}
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-ink-900">Matches job description keywords</span>
            </div>
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-ink-900">Optimized Skills section</span>
            </div>
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-ink-900">Saved to Application Tracker</span>
            </div>
          </div>

          <div className="mt-8 p-4 bg-gold-300/20 rounded-lg">
            <p className="text-sm text-ink-900 font-medium">Tip. You can edit this resume before saving.</p>
          </div>

          {/* Suggestions Section */}
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-ink-900 mb-3">Improve Your Resume</h3>
            <p className="text-sm text-ink-700 mb-3">
              Have specific changes in mind? Enter your suggestions below and regenerate your resume.
            </p>
            <textarea
              value={suggestions}
              onChange={(e) => setSuggestions(e.target.value)}
              placeholder="E.g., Add more technical skills, emphasize leadership experience, use more action verbs..."
              className="w-full p-3 border border-ink-700/20 rounded-lg text-sm text-ink-900 placeholder-ink-700/50 focus:outline-none focus:ring-2 focus:ring-gold-300 min-h-[100px] resize-y"
              disabled={isRegenerating}
            />
            <button
              onClick={handleRegenerateResume}
              disabled={isRegenerating || !suggestions.trim()}
              className="btn-primary w-full mt-3 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isRegenerating && (
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {isRegenerating ? 'Regenerating Resume...' : 'Regenerate Resume'}
            </button>
          </div>
        </div>
      </div>

      {/* Resume Comparison Modal */}
      {resume && (
        <ResumeComparisonModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          originalResumeText={originalResumeText}
          generatedResume={resume}
        />
      )}
    </div>
  );
}
