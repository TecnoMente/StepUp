// Seed script for development
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Sample Job Description
  const sampleJD = `Software Engineer Intern
Vise, MI

We are seeking a Software Engineering Intern to join our team in Ann Arbor, MI. The ideal candidate will have experience with web applications, React, TypeScript, and modern cloud architecture.

Responsibilities:
- Develop web applications using JavaScript and React
- Collaborate with the engineering team to improve debugging tools
- Write clean, maintainable code
- Participate in code reviews and team meetings

Requirements:
- Currently pursuing a Bachelor's degree in Computer Science or related field
- Strong understanding of JavaScript, TypeScript, React
- Experience with version control (Git)
- Excellent problem-solving skills
- Strong communication and teamwork abilities

Nice to have:
- Experience with Node.js, Next.js, or Flutter
- Knowledge of cloud platforms (AWS, Azure, GCP)
- Previous internship experience`;

  // Sample Resume Text
  const sampleResume = `JORDAN PATEL
jordan.patel@domain.com • 11-28-455-7880
linkedin.com/in/jordanpatel

EDUCATION
University of Michigan, Ann Arbor MI                                May–Aug, 2026
Bach-for of science in Computer Science architecture

EXPERIENCE
Software Engineering Intern • Vise, MI                              May–Aug 2025
• Developed web applications using JavaScript and React
• Collaboration to improve debugging tools

IT Assistant UM College of Engineering                          Sep, 2024 – Apr, 2025
• Maintained online systems and provided tech support staff

PROJECTS
• Online collaboration tool using JavaScript and React
• Mobile task-tracking app built with Flutter`;

  // Create sample session
  const session = await prisma.session.create({
    data: {
      jdText: sampleJD,
      resumeText: sampleResume,
      extraText: 'Additional skills: Python, SQL, Docker',
      terms: JSON.stringify([
        'JavaScript',
        'React',
        'TypeScript',
        'Web Applications',
        'Git',
        'Problem-solving',
        'Computer Science',
        'Collaboration',
        'Debugging',
        'Code Review',
      ]),
    },
  });

  console.log('Created sample session:', session.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
