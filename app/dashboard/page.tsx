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
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            My Resumes & Cover Letters
          </h1>
          <p className="mt-2 text-gray-600">
            Access your tailored resumes and cover letters from any device
          </p>
        </div>

        <DashboardClient sessions={sessions} />
      </div>
    </div>
  );
}
