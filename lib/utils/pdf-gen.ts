// Simple HTML to PDF generation for resume and cover letter
// For MVP: Returns HTML that can be printed to PDF via browser
import type { TailoredResume, TailoredCoverLetter } from '@/lib/types';

/**
 * Generate print-ready HTML for a tailored resume
 */
export function generateResumeHTML(resume: TailoredResume, name: string = 'Resume'): string {
  const sectionsHTML = resume.sections
    .map((section) => {
      const itemsHTML = section.items
        .map((item) => {
          const header = item.title
            ? `<div class="item-header">
                <div>
                  ${item.title ? `<strong>${item.title}</strong>` : ''}
                  ${item.organization ? ` • ${item.organization}` : ''}
                </div>
                <div class="item-meta">
                  ${item.location || ''} ${item.dateRange || ''}
                </div>
              </div>`
            : '';

          const bulletsHTML = item.bullets
            ? `<ul class="bullets">
                ${item.bullets.map((b) => `<li>${b.text}</li>`).join('')}
              </ul>`
            : '';

          return `<div class="item">${header}${bulletsHTML}</div>`;
        })
        .join('');

      return `
        <div class="section">
          <h3 class="section-title">${section.name.toUpperCase()}</h3>
          ${itemsHTML}
        </div>
      `;
    })
    .join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${name}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Georgia', 'Times New Roman', serif;
      font-size: 11pt;
      line-height: 1.4;
      color: #000;
      max-width: 8.5in;
      margin: 0.5in auto;
      background: white;
    }
    h1 {
      font-size: 24pt;
      text-align: center;
      margin-bottom: 0.2in;
      border-bottom: 2px solid #000;
      padding-bottom: 0.1in;
    }
    .section {
      margin-bottom: 0.3in;
    }
    .section-title {
      font-size: 12pt;
      font-weight: bold;
      border-bottom: 1px solid #333;
      margin-bottom: 0.1in;
      padding-bottom: 0.05in;
    }
    .item {
      margin-bottom: 0.15in;
    }
    .item-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 0.05in;
    }
    .item-meta {
      text-align: right;
      font-style: italic;
    }
    .bullets {
      margin-left: 0.3in;
      margin-top: 0.05in;
    }
    .bullets li {
      margin-bottom: 0.05in;
    }
    @media print {
      body {
        margin: 0;
      }
    }
  </style>
</head>
<body>
  <h1>${name}</h1>
  ${resume.summary ? `<p style="text-align: center; margin-bottom: 0.2in;">${resume.summary}</p>` : ''}
  ${sectionsHTML}
  <div style="margin-top: 0.5in; padding-top: 0.2in; border-top: 1px solid #ccc; text-align: center; font-size: 9pt; color: #666;">
    All content is derived from your inputs. Nothing is fabricated.
  </div>
</body>
</html>
  `;
}

/**
 * Generate print-ready HTML for a tailored cover letter
 */
export function generateCoverLetterHTML(
  letter: TailoredCoverLetter,
  name: string = 'Cover Letter'
): string {
  const paragraphsHTML = letter.paragraphs.map((p) => `<p>${p.text}</p>`).join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${name}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Georgia', 'Times New Roman', serif;
      font-size: 12pt;
      line-height: 1.6;
      color: #000;
      max-width: 8.5in;
      margin: 0.75in auto;
      background: white;
    }
    p {
      margin-bottom: 1em;
      text-align: justify;
    }
    .salutation, .closing {
      margin-bottom: 1em;
    }
    @media print {
      body {
        margin: 0;
      }
    }
  </style>
</head>
<body>
  <div class="salutation">${letter.salutation}</div>
  ${paragraphsHTML}
  <div class="closing" style="white-space: pre-line;">${letter.closing}</div>
  <div style="margin-top: 2in; padding-top: 0.2in; border-top: 1px solid #ccc; text-align: center; font-size: 9pt; color: #666;">
    All content is derived from your inputs. Nothing is fabricated.
  </div>
</body>
</html>
  `;
}
