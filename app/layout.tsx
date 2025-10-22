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
            <a href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <img src="/beige_logo.png" alt="StepUp Logo" className="h-10 w-10" />
              <span className="text-2xl font-serif font-bold text-beige-50">StepUp</span>
            </a>
            <div className="flex gap-6 text-beige-50">
              <a href="/resumes" className="hover:text-gold-300 transition-colors font-medium">
                Resumes
              </a>
              <a href="/cover-letters" className="hover:text-gold-300 transition-colors font-medium">
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
