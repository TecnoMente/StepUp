'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import type { TailoredCoverLetter } from '@/lib/types';

function PrintCoverLetterContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('sessionId');
  const [letter, setLetter] = useState<TailoredCoverLetter | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    fetch(`/api/session/${sessionId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.letterJson) {
          setLetter(JSON.parse(data.letterJson));
        }
      })
      .catch((err) => console.error('Error fetching cover letter:', err));
  }, [sessionId]);

  useEffect(() => {
    if (letter) {
      // Trigger print dialog after a short delay to ensure content is rendered
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [letter]);

  if (!letter) {
    return <div className="p-8 text-center">Loading cover letter...</div>;
  }

  return (
    <div className="cover-letter-print">
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

        .cover-letter-print {
          font-family: 'Georgia', 'Times New Roman', serif;
          font-size: 12pt;
          line-height: 1.6;
          color: #000;
          max-width: 8.5in;
          margin: 0.75in auto;
          background: white;
          padding: 20px;
        }

        .cover-letter-print p {
          margin-bottom: 1em;
          text-align: justify;
        }

        .cover-letter-print .salutation,
        .cover-letter-print .closing {
          margin-bottom: 1em;
        }

        .cover-letter-print .closing {
          white-space: pre-line;
        }

        .cover-letter-print .footer {
          margin-top: 2in;
          padding-top: 0.2in;
          border-top: 1px solid #ccc;
          text-align: center;
          font-size: 9pt;
          color: #666;
        }
      `}</style>

      <div className="salutation">{letter.salutation}</div>

      {letter.paragraphs.map((paragraph, idx) => (
        <p key={idx}>{paragraph.text}</p>
      ))}

      <div className="closing">{letter.closing}</div>

      <div className="footer no-print">
        All content is derived from your inputs. Nothing is fabricated.
      </div>
    </div>
  );
}

export default function PrintCoverLetterPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
      <PrintCoverLetterContent />
    </Suspense>
  );
}
