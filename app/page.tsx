'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

export default function HomePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [jobDescription, setJobDescription] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [position, setPosition] = useState('');
  const [extraInfo, setExtraInfo] = useState('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [loadingAction, setLoadingAction] = useState<null | 'resume' | 'cover'>(null);
  const [error, setError] = useState('');

  // Redirect to sign in if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin?callbackUrl=/');
    }
  }, [status, router]);

  // Show loading while checking authentication
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated (redirect will happen)
  if (status === 'unauthenticated') {
    return null;
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setResumeFile(e.target.files[0]);
      setError('');
    }
  };

  const handleGenerateResume = async () => {
    setError('');

    if (!jobDescription.trim()) {
      setError('Please enter a job description');
      return;
    }

    if (!resumeFile) {
      setError('Please upload your resume (PDF)');
      return;
    }

  setLoadingAction('resume');

    try {
      // Create session
      const sessionRes = await fetch('/api/session', { method: 'POST' });
      const { sessionId } = await sessionRes.json();

      // Upload resume
      const formData = new FormData();
      formData.append('sessionId', sessionId);
      formData.append('file', resumeFile);

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) {
        throw new Error('Failed to upload resume');
      }

      // Extract ATS terms
      const termsRes = await fetch('/api/generate/ats-terms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, jobDescription, companyName, position }),
      });

      if (!termsRes.ok) {
        throw new Error('Failed to analyze job description');
      }

      // Generate tailored resume
      const resumeRes = await fetch('/api/generate/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, extraText: extraInfo }),
      });

      if (!resumeRes.ok) {
        const errorData = await resumeRes.json();
        throw new Error(errorData.error || 'Failed to generate resume');
      }

      // Navigate to resume page
      router.push(`/resume?sessionId=${sessionId}`);
    } catch (err) {
      console.error('Error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="container-custom py-12">
      {/* Hero Section */}
      <div className="text-center mb-16">
        <h1 className="text-5xl md:text-6xl font-serif font-bold text-beige-50 mb-4">
          Instantly Tailored.
          <br />
          Instantly Ready.
        </h1>
      </div>

      {/* Three Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {/* Card 1: Paste Job Description */}
        <div className="card-beige">
          <h2 className="text-xl font-serif font-bold mb-4 text-ink-900">
            Job Details
          </h2>
          <div className="space-y-3 mb-4">
            <input
              type="text"
              className="w-full p-3 border-2 border-ink-700/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-300 focus:border-transparent"
              placeholder="Company Name (e.g., Google)"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
            <input
              type="text"
              className="w-full p-3 border-2 border-ink-700/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-300 focus:border-transparent"
              placeholder="Position (e.g., Software Engineer)"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
            />
          </div>
          <textarea
            className="w-full h-48 p-4 border-2 border-ink-700/20 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-gold-300 focus:border-transparent"
            placeholder="Paste job description here..."
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
          />
        </div>

        {/* Card 2: Generate Tailored Resume */}
        <div className="card-beige flex flex-col items-center justify-center text-center">
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            className="hidden"
            id="resume-upload"
          />

          {/* Clickable upload area with cloud icon */}
          <label
            htmlFor="resume-upload"
            className="cursor-pointer mb-6 group"
          >
            <div className="transition-transform group-hover:scale-105">
              <svg
                className="w-24 h-24 mx-auto text-ink-700 group-hover:text-gold-400 transition-colors"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            </div>
            <div className="mt-4 text-lg font-semibold text-ink-900 group-hover:text-gold-400 transition-colors">
              {resumeFile ? (
                <span className="text-green-700">✓ {resumeFile.name}</span>
              ) : (
                'Upload Resume (PDF)'
              )}
            </div>
            {!resumeFile && (
              <div className="text-sm text-ink-700 mt-2">Click cloud to upload</div>
            )}
          </label>

          <button
            onClick={handleGenerateResume}
            disabled={(loadingAction !== null) || !resumeFile}
            className={`btn-primary w-full transition-all ${
              !resumeFile
                ? 'opacity-40 cursor-not-allowed bg-gray-400'
                : loadingAction === 'resume'
                ? 'opacity-100 hover:bg-gold-400'
                : loadingAction === 'cover'
                ? 'opacity-40 cursor-not-allowed bg-gray-400'
                : 'opacity-100 hover:bg-gold-400'
            }`}
          >
            {loadingAction === 'resume' ? 'Generating...' : 'Generate Tailored Resume'}
          </button>
          {/* Generate Cover Letter button */}
          <button
            onClick={async () => {
              // Reuse the same validation as resume generation
              setError('');

              if (!jobDescription.trim()) {
                setError('Please enter a job description');
                return;
              }

              if (!resumeFile) {
                setError('Please upload your resume (PDF)');
                return;
              }

              setLoadingAction('cover');
              try {
                // Create session
                const sessionRes = await fetch('/api/session', { method: 'POST' });
                const { sessionId } = await sessionRes.json();

                // Upload resume
                const formData = new FormData();
                formData.append('sessionId', sessionId);
                formData.append('file', resumeFile);

                const uploadRes = await fetch('/api/upload', {
                  method: 'POST',
                  body: formData,
                });

                if (!uploadRes.ok) {
                  throw new Error('Failed to upload resume');
                }

                // Extract ATS terms
                const termsRes = await fetch('/api/generate/ats-terms', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ sessionId, jobDescription, companyName, position }),
                });

                if (!termsRes.ok) {
                  throw new Error('Failed to analyze job description');
                }

                // Generate cover letter
                const letterRes = await fetch('/api/generate/cover-letter', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ sessionId }),
                });

                if (!letterRes.ok) {
                  const errorData = await letterRes.json();
                  throw new Error(errorData.error || 'Failed to generate cover letter');
                }

                // Navigate to cover letter page
                router.push(`/cover-letter?sessionId=${sessionId}`);
              } catch (err) {
                console.error('Error generating cover letter:', err);
                setError(err instanceof Error ? err.message : 'An error occurred');
              } finally {
                setLoadingAction(null);
              }
            }}
            disabled={(loadingAction !== null) || !resumeFile}
            className={`btn-primary mt-3 w-full transition-all ${
              !resumeFile
                ? 'opacity-40 cursor-not-allowed bg-gray-400'
                : loadingAction === 'cover'
                ? 'opacity-100 hover:bg-gold-400'
                : loadingAction === 'resume'
                ? 'opacity-40 cursor-not-allowed bg-gray-400'
                : 'opacity-100 hover:bg-gold-400'
            }`}
          >
            {loadingAction === 'cover' ? 'Generating...' : 'Generate Cover Letter'}
          </button>
          {error && (
            <p className="mt-4 text-sm text-red-600 font-semibold">{error}</p>
          )}
        </div>

        {/* Card 3: List Additional Info */}
        <div className="card-beige">
          <h2 className="text-xl font-serif font-bold mb-4 text-ink-900">
            List additional projects, extracurriculars and skills
          </h2>
          <p className="text-sm text-ink-700 mb-4">
            Add any extra information not in your resume
          </p>
          <textarea
            className="w-full h-48 p-4 border-2 border-ink-700/20 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-gold-300 focus:border-transparent"
            placeholder="E.g., Python, SQL, Docker..."
            value={extraInfo}
            onChange={(e) => setExtraInfo(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
