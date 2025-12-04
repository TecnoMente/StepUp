'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Session {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  companyName: string | null;
  position: string | null;
  atsScore: number | null;
  resumeJson: string | null;
  letterJson: string | null;
}

export default function DashboardClient({ sessions }: { sessions: Session[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<'resumes' | 'letters'>('resumes');

  const filteredSessions = sessions.filter((session) => {
    if (filter === 'resumes') return session.resumeJson !== null;
    if (filter === 'letters') return session.letterJson !== null;
    return true;
  });

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div>
      {/* Filter Tabs */}
      <div className="mb-6 border-b border-beige-50/20">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setFilter('resumes')}
            className={`${
              filter === 'resumes'
                ? 'border-gold-300 text-gold-300'
                : 'border-transparent text-beige-50/70 hover:text-beige-50 hover:border-beige-50/30'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Resumes ({sessions.filter((s) => s.resumeJson).length})
          </button>
          <button
            onClick={() => setFilter('letters')}
            className={`${
              filter === 'letters'
                ? 'border-gold-300 text-gold-300'
                : 'border-transparent text-beige-50/70 hover:text-beige-50 hover:border-beige-50/30'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Cover Letters ({sessions.filter((s) => s.letterJson).length})
          </button>
        </nav>
      </div>

      {/* Sessions List */}
      {filteredSessions.length === 0 ? (
        <div className="card-beige text-center max-w-2xl mx-auto">
          <p className="text-xl text-ink-900 mb-6">
            You haven&apos;t created any {filter === 'resumes' ? 'resumes' : 'cover letters'} yet.
          </p>
          <Link href="/" className="btn-primary inline-block">
            Create Your First Resume
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
          {filteredSessions.map((session) => (
            <div
              key={session.id}
              className="card-beige hover:shadow-xl transition-shadow"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-ink-900">
                    {session.position || 'Untitled Position'}
                  </h3>
                  {session.companyName && (
                    <p className="text-sm font-semibold text-ink-900 mb-1 truncate">
                      {session.companyName}
                    </p>
                  )}
                  <p className="text-sm text-ink-700">
                    {formatDate(session.createdAt)}
                  </p>
                </div>
                {session.atsScore !== null && (
                  <div className="bg-gold-300 text-ink-900 px-3 py-1 rounded-full text-sm font-semibold flex-shrink-0 ml-2">
                    {session.atsScore} ATS
                  </div>
                )}
              </div>

              <div className="flex gap-2 mb-4">
                {session.resumeJson && filter === 'resumes' && (
                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gold-300/30 text-ink-900">
                    Resume
                  </span>
                )}
                {session.letterJson && filter === 'letters' && (
                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gold-300/30 text-ink-900">
                    Cover Letter
                  </span>
                )}
              </div>

              <div className="space-y-2">
                {session.resumeJson && filter === 'resumes' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => router.push(`/resume?sessionId=${session.id}`)}
                      className="btn-primary flex-1 text-sm"
                    >
                      Edit Resume
                    </button>
                    <button
                      onClick={() => window.location.href = `/api/download/resume?sessionId=${session.id}`}
                      className="bg-beige-100 text-ink-900 hover:bg-beige-200 flex-1 text-sm px-4 py-2 rounded font-medium transition-colors"
                    >
                      Download
                    </button>
                  </div>
                )}
                {session.letterJson && filter === 'letters' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => router.push(`/cover-letter?sessionId=${session.id}`)}
                      className="btn-primary flex-1 text-sm"
                    >
                      Edit Letter
                    </button>
                    <button
                      onClick={() => window.location.href = `/api/download/cover-letter?sessionId=${session.id}`}
                      className="bg-beige-100 text-ink-900 hover:bg-beige-200 flex-1 text-sm px-4 py-2 rounded font-medium transition-colors"
                    >
                      Download
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
