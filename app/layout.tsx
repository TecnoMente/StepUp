import type { Metadata } from "next";
import Image from 'next/image';
import "./globals.css";
import SessionProvider from '@/components/providers/SessionProvider';
import Navigation from '@/components/Navigation';

export const metadata: Metadata = {
  title: "StepUp - ATS Resume & Cover Letter Generator",
  description: "Instantly tailored. Instantly ready. Optimize your resume and cover letter for ATS.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>
          <Navigation />
          <main className="min-h-[calc(100vh-80px)]">
            {children}
          </main>
        </SessionProvider>
      </body>
    </html>
  );
}
