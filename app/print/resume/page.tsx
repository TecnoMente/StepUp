'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import type { TailoredResume } from '@/lib/types';

function PrintResumeContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('sessionId');
  const [resume, setResume] = useState<TailoredResume | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    fetch(`/api/session/${sessionId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.resumeJson) {
          setResume(JSON.parse(data.resumeJson));
        }
      })
      .catch((err) => console.error('Error fetching resume:', err));
  }, [sessionId]);

  useEffect(() => {
    if (resume) {
      // Trigger print dialog after a short delay to ensure content is rendered
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [resume]);

  if (!resume) {
    return <div className="p-8 text-center">Loading resume...</div>;
  }

  return (
    <div className="resume-print">
      <style jsx global>{`
        @media print {
          body {
            margin: 0;
            padding: 0;
          }
          .no-print {
            display: none !important;
          }
        }

        .resume-print {
          font-family: 'Georgia', 'Times New Roman', serif;
          font-size: 11pt;
          line-height: 1.4;
          color: #000;
          max-width: 8.5in;
          margin: 0.5in auto;
          background: white;
          padding: 20px;
        }

        .resume-print h1 {
          font-size: 24pt;
          text-align: center;
          margin-bottom: 0.2in;
          border-bottom: 2px solid #000;
          padding-bottom: 0.1in;
        }

        .resume-print .summary {
          text-align: center;
          margin-bottom: 0.3in;
          font-style: italic;
        }

        .resume-print .section {
          margin-bottom: 0.3in;
        }

        .resume-print .section-title {
          font-size: 12pt;
          font-weight: bold;
          border-bottom: 1px solid #333;
          margin-bottom: 0.1in;
          padding-bottom: 0.05in;
        }

        .resume-print .item {
          margin-bottom: 0.15in;
        }

        .resume-print .item-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.05in;
        }

        .resume-print .item-meta {
          text-align: right;
          font-style: italic;
        }

        .resume-print .bullets {
          margin-left: 0.3in;
          margin-top: 0.05in;
        }

        .resume-print .bullets li {
          margin-bottom: 0.05in;
        }

        .resume-print .footer {
          margin-top: 0.5in;
          padding-top: 0.2in;
          border-top: 1px solid #ccc;
          text-align: center;
          font-size: 9pt;
          color: #666;
        }
      `}</style>

      <h1>{resume.name.toUpperCase()}</h1>

      {resume.summary && (
        <p className="summary">{resume.summary}</p>
      )}

      {resume.sections.map((section, idx) => (
        <div key={idx} className="section">
          <h3 className="section-title">{section.name.toUpperCase()}</h3>
          {section.items.map((item, itemIdx) => (
            <div key={itemIdx} className="item">
              {item.title && (
                <div className="item-header">
                  <div>
                    <strong>{item.title}</strong>
                    {item.organization && ` • ${item.organization}`}
                  </div>
                  <div className="item-meta">
                    {item.location} {item.dateRange}
                  </div>
                </div>
              )}
              {item.bullets && (
                <ul className="bullets">
                  {item.bullets.map((bullet, bulletIdx) => (
                    <li key={bulletIdx}>{bullet.text}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      ))}

      <div className="footer no-print">
        All content is derived from your inputs. Nothing is fabricated.
      </div>
    </div>
  );
}

export default function PrintResumePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
      <PrintResumeContent />
    </Suspense>
  );
}
