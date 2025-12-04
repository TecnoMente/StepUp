import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/utils/db';
import DashboardClient from './DashboardClient';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/auth/signin?callbackUrl=/dashboard');
  }

  // Fetch user's sessions
  const sessions = await prisma.session.findMany({
    where: {
      userId: session.user.id,
    },
    orderBy: {
      createdAt: 'desc',
    },
    select: {
      id: true,
      createdAt: true,
      updatedAt: true,
      companyName: true,
      position: true,
      atsScore: true,
      resumeJson: true,
      letterJson: true,
    },
  });

  return (
    <div className="min-h-screen py-12">
      <div className="container-custom">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-beige-50 mb-3">
            My Resumes & Cover Letters
          </h1>
          <p className="text-lg text-beige-50/90">
            Access your tailored resumes and cover letters from any device
          </p>
        </div>

        <DashboardClient sessions={sessions} />
      </div>
    </div>
  );
}
