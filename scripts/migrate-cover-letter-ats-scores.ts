// Migration script to populate atsScore for existing cover letters
// This script reads all sessions with cover letters and calculates their ATS scores

import { PrismaClient } from '@prisma/client';
import type { TailoredCoverLetter } from '../lib/types';

const prisma = new PrismaClient();

function recalculateMatchedTermsForCoverLetter(letter: TailoredCoverLetter): number {
  const uniqueTerms = new Set<string>();

  for (const paragraph of letter.paragraphs) {
    paragraph.matched_terms.forEach((term) => uniqueTerms.add(term));
  }

  return uniqueTerms.size;
}

async function migrateCoverLetterAtsScores() {
  console.log('Starting migration of cover letter ATS scores...');

  // Find all sessions with cover letters but no atsScore
  const sessions = await prisma.session.findMany({
    where: {
      letterJson: {
        not: null,
      },
    },
  });

  console.log(`Found ${sessions.length} sessions with cover letters`);

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const session of sessions) {
    try {
      if (!session.letterJson) {
        skipped++;
        continue;
      }

      const letter = JSON.parse(session.letterJson) as TailoredCoverLetter;
      const atsScore = recalculateMatchedTermsForCoverLetter(letter);

      // Update the session with the calculated ATS score
      await prisma.session.update({
        where: { id: session.id },
        data: {
          atsScore: atsScore,
        },
      });

      console.log(`Updated session ${session.id} with ATS score: ${atsScore}`);
      updated++;
    } catch (error) {
      console.error(`Error processing session ${session.id}:`, error);
      errors++;
    }
  }

  console.log('\nMigration complete!');
  console.log(`Updated: ${updated}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Errors: ${errors}`);

  await prisma.$disconnect();
}

migrateCoverLetterAtsScores().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
