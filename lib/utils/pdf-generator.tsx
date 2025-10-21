// PDF Generation using @react-pdf/renderer
import React from 'react';
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from '@react-pdf/renderer';
import type { TailoredResume, TailoredCoverLetter } from '@/lib/types';

// Create styles for resume PDF - optimized to fit on ONE page
const resumeStyles = StyleSheet.create({
  page: {
    padding: '0.35in 0.45in',
    fontSize: 8,
    fontFamily: 'Helvetica',
    lineHeight: 1.25,
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 3,
    borderBottom: '2pt solid #000',
    paddingBottom: 3,
  },
  summary: {
    fontSize: 7.5,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 5,
    color: '#333',
  },
  section: {
    marginBottom: 5,
  },
  sectionTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    borderBottom: '1pt solid #333',
    marginBottom: 2,
    paddingBottom: 1,
  },
  item: {
    marginBottom: 3,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 1,
  },
  itemTitle: {
    fontSize: 8,
    fontWeight: 'bold',
  },
  itemOrganization: {
    fontSize: 8,
  },
  itemMeta: {
    fontSize: 7,
    fontStyle: 'italic',
    color: '#555',
  },
  bulletList: {
    marginLeft: 12,
    marginTop: 1,
  },
  bullet: {
    fontSize: 7.5,
    marginBottom: 0.8,
    flexDirection: 'row',
  },
  bulletText: {
    flex: 1,
    paddingLeft: 2,
  },
});

// Create styles for cover letter PDF
const coverLetterStyles = StyleSheet.create({
  page: {
    padding: '0.75in',
    fontSize: 11,
    fontFamily: 'Helvetica',
    lineHeight: 1.5,
  },
  salutation: {
    marginBottom: 15,
  },
  paragraph: {
    marginBottom: 12,
    textAlign: 'justify',
  },
  closing: {
    marginTop: 15,
    marginBottom: 10,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 8,
    textAlign: 'center',
    color: '#999',
    borderTop: '1pt solid #ddd',
    paddingTop: 8,
  },
});

// Resume PDF Document Component
export const ResumePDFDocument = ({ resume }: { resume: TailoredResume }) => (
  <Document>
    <Page size="A4" style={resumeStyles.page}>
      <Text style={resumeStyles.name}>{resume.name.toUpperCase()}</Text>

      {resume.summary && (
        <Text style={resumeStyles.summary}>{resume.summary}</Text>
      )}

      {resume.sections.map((section, sectionIdx) => (
        <View key={sectionIdx} style={resumeStyles.section}>
          <Text style={resumeStyles.sectionTitle}>{section.name.toUpperCase()}</Text>

          {section.items.map((item, itemIdx) => (
            <View key={itemIdx} style={resumeStyles.item}>
              {item.title && (
                <View style={resumeStyles.itemHeader}>
                  <View style={{ flexDirection: 'row', flex: 1 }}>
                    <Text style={resumeStyles.itemTitle}>{item.title}</Text>
                    {item.organization && (
                      <Text style={resumeStyles.itemOrganization}> • {item.organization}</Text>
                    )}
                  </View>
                  <Text style={resumeStyles.itemMeta}>
                    {item.location} {item.dateRange}
                  </Text>
                </View>
              )}

              {item.bullets && item.bullets.length > 0 && (
                <View style={resumeStyles.bulletList}>
                  {item.bullets.map((bullet, bulletIdx) => (
                    <View key={bulletIdx} style={resumeStyles.bullet}>
                      <Text>•</Text>
                      <Text style={resumeStyles.bulletText}>{bullet.text}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}
        </View>
      ))}
    </Page>
  </Document>
);

// Cover Letter PDF Document Component
export const CoverLetterPDFDocument = ({ letter }: { letter: TailoredCoverLetter }) => (
  <Document>
    <Page size="A4" style={coverLetterStyles.page}>
      <Text style={coverLetterStyles.salutation}>{letter.salutation}</Text>

      {letter.paragraphs.map((paragraph, idx) => (
        <Text key={idx} style={coverLetterStyles.paragraph}>
          {paragraph.text}
        </Text>
      ))}

      <Text style={coverLetterStyles.closing}>{letter.closing}</Text>
    </Page>
  </Document>
);

// Helper function to generate resume PDF buffer
export async function generateResumePDF(resume: TailoredResume): Promise<Buffer> {
  const doc = <ResumePDFDocument resume={resume} />;
  return await renderToBuffer(doc);
}

// Helper function to generate cover letter PDF buffer
export async function generateCoverLetterPDF(letter: TailoredCoverLetter): Promise<Buffer> {
  const doc = <CoverLetterPDFDocument letter={letter} />;
  return await renderToBuffer(doc);
}
