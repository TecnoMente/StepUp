import type { Metadata } from "next";
import "./globals.css";

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
        <nav className="bg-teal-900/50 backdrop-blur-sm border-b border-teal-800">
          <div className="container-custom py-4 flex justify-between items-center">
            <a href="/" className="text-2xl font-serif font-bold text-beige-50 hover:text-gold-300 transition-colors">
              StepUp
            </a>
            <div className="flex gap-6 text-beige-50">
              <a href="/" className="hover:text-gold-300 transition-colors font-medium">
                Resumes
              </a>
              <a href="/" className="hover:text-gold-300 transition-colors font-medium">
                Cover Letters
              </a>
            </div>
          </div>
        </nav>
        <main className="min-h-[calc(100vh-80px)]">
          {children}
        </main>
      </body>
    </html>
  );
}
