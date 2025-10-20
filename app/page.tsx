'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();
  const [jobDescription, setJobDescription] = useState('');
  const [extraInfo, setExtraInfo] = useState('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

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

    setIsLoading(true);

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
        body: JSON.stringify({ sessionId, jobDescription }),
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
      setIsLoading(false);
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
            Paste Job Description
          </h2>
          <textarea
            className="w-full h-64 p-4 border-2 border-ink-700/20 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-gold-300 focus:border-transparent"
            placeholder="Enter job description or paste below;"
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
          />
        </div>

        {/* Card 2: Generate Tailored Resume */}
        <div className="card-beige flex flex-col items-center justify-center text-center">
          <div className="mb-6">
            <svg
              className="w-24 h-24 mx-auto text-ink-700"
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
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            className="hidden"
            id="resume-upload"
          />
          <label
            htmlFor="resume-upload"
            className="btn-secondary cursor-pointer mb-4"
          >
            {resumeFile ? resumeFile.name : 'Upload Resume (PDF)'}
          </label>
          <button
            onClick={handleGenerateResume}
            disabled={isLoading}
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Generating...' : 'Generate Tailored Resume'}
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
