// PDF Generation using @react-pdf/renderer
import React from 'react';
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from '@react-pdf/renderer';
import type { TailoredResume, TailoredCoverLetter } from '@/lib/types';

// ATS-COMPLIANT Resume PDF Styles - BALANCED FOR APPEARANCE & ONE-PAGE FIT
// Following strict ATS best practices: single column, standard fonts, simple formatting
// Optimized for professional appearance while maintaining one-page constraint
const resumeStyles = StyleSheet.create({
  page: {
    padding: '0.5in 0.5in', // ATS-compliant minimum margins
    fontSize: 10, // ATS minimum (10-12pt range)
    fontFamily: 'Helvetica', // ATS-safe font (Arial/Calibri/Helvetica)
    lineHeight: 1.15, // ATS-compliant spacing (1.0-1.15 range)
    color: '#000000', // Black text only (ATS requirement)
  },
  name: {
    fontSize: 16, // Professional header size
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
    borderBottom: '2pt solid #000', // Simple horizontal rule (ATS-safe)
    paddingBottom: 4,
    letterSpacing: 0.5,
  },
  summary: {
    fontSize: 10, // Match body font
    textAlign: 'left', // Left-align for ATS parsing
    marginBottom: 6,
    lineHeight: 1.15,
  },
  section: {
    marginBottom: 6, // Better visual separation
  },
  sectionTitle: {
    fontSize: 11, // Slightly larger for hierarchy
    fontWeight: 'bold',
    borderBottom: '1pt solid #000', // Simple divider (ATS-safe)
    marginBottom: 3,
    paddingBottom: 2,
    textTransform: 'uppercase', // Standard section headers
  },
  item: {
    marginBottom: 4, // Better spacing between experiences
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  itemTitle: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  itemOrganization: {
    fontSize: 10,
  },
  itemMeta: {
    fontSize: 9, // Slightly smaller for metadata
    fontStyle: 'italic',
    color: '#000', // Black only (ATS requirement)
  },
  bulletList: {
    marginLeft: 18, // Standard indent
    marginTop: 2,
  },
  bullet: {
    fontSize: 10, // Match body font
    marginBottom: 1.5, // Breathing room between bullets
    flexDirection: 'row',
    lineHeight: 1.15,
  },
  bulletText: {
    flex: 1,
    paddingLeft: 4,
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
