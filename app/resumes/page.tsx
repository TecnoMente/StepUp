'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface ResumeSession {
  id: string;
  createdAt: string;
  atsScore: number | null;
}

export default function ResumesPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<ResumeSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch all sessions with resumes
    fetch('/api/sessions/resumes')
      .then((res) => res.json())
      .then((data) => {
        setSessions(data.sessions || []);
      })
      .catch((err) => console.error('Error fetching resumes:', err))
      .finally(() => setIsLoading(false));
  }, []);

  const handleViewResume = (sessionId: string) => {
    router.push(`/resume?sessionId=${sessionId}`);
  };

  if (isLoading) {
    return (
      <div className="container-custom py-12">
        <div className="text-center text-beige-50 text-xl">Loading your resumes...</div>
      </div>
    );
  }

  return (
    <div className="container-custom py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-serif font-bold text-beige-50 mb-3">
          Your Resumes
        </h1>
        <p className="text-lg text-beige-50/90">
          View and download your previously generated resumes
        </p>
      </div>

      {sessions.length === 0 ? (
        <div className="card-beige text-center max-w-2xl mx-auto">
          <p className="text-xl text-ink-900 mb-6">
            You haven&apos;t created any resumes yet.
          </p>
          <a href="/" className="btn-primary inline-block">
            Create Your First Resume
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {sessions.map((session) => (
            <div key={session.id} className="card-beige hover:shadow-xl transition-shadow cursor-pointer" onClick={() => handleViewResume(session.id)}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-ink-900">Resume</h3>
                  <p className="text-sm text-ink-700">
                    {new Date(session.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                {session.atsScore !== null && (
                  <div className="bg-gold-300 text-ink-900 px-3 py-1 rounded-full text-sm font-semibold">
                    {session.atsScore} ATS
                  </div>
                )}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleViewResume(session.id);
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
