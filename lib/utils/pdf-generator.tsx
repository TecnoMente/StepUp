// PDF Generation using @react-pdf/renderer
import React from 'react';
import { Document, Page, Text, View, StyleSheet, Link, renderToBuffer } from '@react-pdf/renderer';
import type { TailoredResume, TailoredCoverLetter } from '@/lib/types';

type ResumePDFOptions = {
  bodyFontSize?: number; // default 10
  nameFontSize?: number; // default 16
  sectionTitleSize?: number; // default 11
  pagePadding?: string; // default '0.5in 0.5in'
  lineHeight?: number; // default 1.15
};

// ATS-COMPLIANT Resume PDF Styles - BALANCED FOR APPEARANCE & ONE-PAGE FIT
// Following strict ATS best practices: single column, standard fonts, simple formatting
// Optimized for professional appearance while maintaining one-page constraint
function createResumeStyles(opts?: ResumePDFOptions) {
  const bodyFont = opts?.bodyFontSize ?? 10;
  const nameFont = opts?.nameFontSize ?? 16;
  const sectionFont = opts?.sectionTitleSize ?? 11;
  const padding = opts?.pagePadding ?? '0.5in 0.5in';
  const lHeight = opts?.lineHeight ?? 1.15;

  return StyleSheet.create({
    page: {
      padding: padding,
      fontSize: bodyFont,
      fontFamily: 'Helvetica',
      lineHeight: lHeight,
      color: '#000000',
    },
    name: {
      fontSize: nameFont,
      fontWeight: 'bold',
      textAlign: 'center',
      marginBottom: 6,
      letterSpacing: 0.5,
    },
    contactInfo: {
      fontSize: bodyFont,
      textAlign: 'center',
      marginBottom: 6,
      borderBottom: '2pt solid #000',
      paddingBottom: 6,
      flexDirection: 'row',
      justifyContent: 'center',
      flexWrap: 'wrap',
    },
    summary: {
      fontSize: bodyFont,
      textAlign: 'left',
      marginBottom: 6,
      lineHeight: 1.15,
    },
    section: {
      marginBottom: 6,
    },
    sectionTitle: {
      fontSize: sectionFont,
      fontWeight: 'bold',
      borderBottom: '1pt solid #000',
      marginBottom: 3,
      paddingBottom: 2,
      textTransform: 'uppercase',
    },
    item: {
      marginBottom: 4,
      breakInside: 'avoid',
      pageBreakInside: 'avoid',
    },
    itemHeader: {
      marginBottom: 3,
    },
    itemFirstLine: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 1,
    },
    itemOrganization: {
      fontSize: bodyFont,
      fontWeight: 'bold',
    },
    itemLocation: {
      fontSize: bodyFont,
      textAlign: 'right',
    },
    itemSecondLine: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    itemTitle: {
      fontSize: bodyFont,
      fontStyle: 'italic',
    },
    itemDate: {
      fontSize: bodyFont,
      fontStyle: 'italic',
      textAlign: 'right',
    },
    bulletList: {
      marginLeft: 18,
      marginTop: 2,
      breakInside: 'avoid',
      pageBreakInside: 'avoid',
    },
    bullet: {
      fontSize: bodyFont,
      marginBottom: 1.5,
      flexDirection: 'row',
      lineHeight: 1.15,
      breakInside: 'avoid',
      pageBreakInside: 'avoid',
    },
    bulletText: {
      flex: 1,
      paddingLeft: 4,
    },
  });
}

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
export const ResumePDFDocument = ({ resume, opts }: { resume: TailoredResume; opts?: ResumePDFOptions }) => {
  const resumeStyles = createResumeStyles(opts);
  return (
    <Document>
      <Page size="LETTER" style={resumeStyles.page}>
        <Text style={resumeStyles.name}>{(resume.name || '').toUpperCase()}</Text>

        {/* Contact Info with clickable links */}
        <View style={resumeStyles.contactInfo}>
          {resume.email && (
            <>
              <Text>{resume.email}</Text>
              {(resume.phone || resume.location || resume.linkedin || resume.github) && <Text> • </Text>}
            </>
          )}
          {resume.phone && (
            <>
              <Text>{resume.phone}</Text>
              {(resume.location || resume.linkedin || resume.github) && <Text> • </Text>}
            </>
          )}
          {resume.location && (
            <>
              <Text>{resume.location}</Text>
              {(resume.linkedin || resume.github) && <Text> • </Text>}
            </>
          )}
          {resume.linkedin && (
            <>
              <Link
                src={resume.linkedin.startsWith('http') ? resume.linkedin : `https://${resume.linkedin}`}
                style={{ color: '#000', textDecoration: 'none' }}
              >
                {resume.linkedin.replace(/^https?:\/\//, '').replace(/\/$/, '')}
              </Link>
              {resume.github && <Text> • </Text>}
            </>
          )}
          {resume.github && (
            <Link
              src={resume.github.startsWith('http') ? resume.github : `https://${resume.github}`}
              style={{ color: '#000', textDecoration: 'none' }}
            >
              {resume.github.replace(/^https?:\/\//, '').replace(/\/$/, '')}
            </Link>
          )}
        </View>

        {/* Intentionally omit any top summary to match UMich one-page format */}

        {resume.sections.map((section, sectionIdx) => (
        <View key={sectionIdx} style={resumeStyles.section}>
          <Text style={resumeStyles.sectionTitle}>{section.name.toUpperCase()}</Text>

          {section.items.map((item, itemIdx) => (
            <View key={itemIdx} style={resumeStyles.item}>
              {item.title && (
                <View style={resumeStyles.itemHeader}>
                  {/* First line: Organization and Location */}
                  <View style={resumeStyles.itemFirstLine}>
                    {/* Render organization/title only if present to avoid empty string nodes */}
                    { (item.organization || item.title) ? (
                      <Text style={resumeStyles.itemOrganization}>
                        {item.organization || item.title}
                      </Text>
                    ) : null }
                    { item.location ? (
                      <Text style={resumeStyles.itemLocation}>
                        {item.location}
                      </Text>
                    ) : null }
                  </View>
                  {/* Second line: Title (Role) and Date */}
                  <View style={resumeStyles.itemSecondLine}>
                    { item.title && item.organization ? (
                      <Text style={resumeStyles.itemTitle}>
                        {item.title}
                      </Text>
                    ) : null }
                    { item.dateRange ? (
                      <Text style={resumeStyles.itemDate}>
                        {item.dateRange}
                      </Text>
                    ) : null }
                  </View>
                </View>
              )}

              {item.bullets && item.bullets.length > 0 && (
                <View style={resumeStyles.bulletList}>
                  {item.bullets.map((bullet, bulletIdx) => {
                    const text = typeof bullet.text === 'string' ? bullet.text.trim() : '';
                    if (!text) return null; // skip empty bullets
                    return (
                      <View key={bulletIdx} style={resumeStyles.bullet}>
                        <Text>•</Text>
                        <Text style={resumeStyles.bulletText}>{text}</Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          ))}
        </View>
      ))}
    </Page>
  </Document>
  );
};

// Cover Letter PDF Document Component
export const CoverLetterPDFDocument = ({ letter }: { letter: TailoredCoverLetter }) => (
  <Document>
    <Page size="LETTER" style={coverLetterStyles.page}>
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
export async function generateResumePDF(resume: TailoredResume, opts?: ResumePDFOptions): Promise<Buffer> {
  const doc = <ResumePDFDocument resume={resume} opts={opts} />;
  return await renderToBuffer(doc);
}

// Helper function to generate cover letter PDF buffer
export async function generateCoverLetterPDF(letter: TailoredCoverLetter): Promise<Buffer> {
  const doc = <CoverLetterPDFDocument letter={letter} />;
  return await renderToBuffer(doc);
}
