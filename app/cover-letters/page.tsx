'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface CoverLetterSession {
  id: string;
  createdAt: string;
  atsScore: number | null;
  companyName: string | null;
  position: string | null;
}

export default function CoverLettersPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<CoverLetterSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch all sessions with cover letters
    fetch('/api/sessions/cover-letters')
      .then((res) => res.json())
      .then((data) => {
        setSessions(data.sessions || []);
      })
      .catch((err) => console.error('Error fetching cover letters:', err))
      .finally(() => setIsLoading(false));
  }, []);

  const handleViewCoverLetter = (sessionId: string) => {
    router.push(`/cover-letter?sessionId=${sessionId}`);
  };

  if (isLoading) {
    return (
      <div className="container-custom py-12">
        <div className="text-center text-beige-50 text-xl">Loading your cover letters...</div>
      </div>
    );
  }

  return (
    <div className="container-custom py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-serif font-bold text-beige-50 mb-3">
          Your Cover Letters
        </h1>
        <p className="text-lg text-beige-50/90">
          View and download your previously generated cover letters
        </p>
      </div>

      {sessions.length === 0 ? (
        <div className="card-beige text-center max-w-2xl mx-auto">
          <p className="text-xl text-ink-900 mb-6">
            You haven&apos;t created any cover letters yet.
          </p>
          <p className="text-sm text-ink-700 mb-6">
            Cover letters are generated after creating a tailored resume.
          </p>
          <a href="/" className="btn-primary inline-block">
            Create a Resume First
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {sessions.map((session) => (
            <div key={session.id} className="card-beige hover:shadow-xl transition-shadow cursor-pointer" onClick={() => handleViewCoverLetter(session.id)}>
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-ink-900">Cover Letter</h3>
                  {(session.companyName || session.position) && (
                    <p className="text-sm font-semibold text-ink-900 mb-1 truncate">
                      {session.companyName && session.position
                        ? `${session.companyName} - ${session.position}`
                        : session.companyName || session.position}
                    </p>
                  )}
                  <p className="text-sm text-ink-700">
                    {new Date(session.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                {session.atsScore !== null && (
                  <div className="bg-gold-300 text-ink-900 px-3 py-1 rounded-full text-sm font-semibold flex-shrink-0 ml-2">
                    {session.atsScore} ATS
                  </div>
                )}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleViewCoverLetter(session.id);
                }}
                className="btn-primary w-full text-sm"
              >
                View & Download
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
