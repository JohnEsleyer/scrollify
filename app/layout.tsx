// app/layout.tsx
import './globals.css'; // Import your global styles (e.g., Tailwind CSS base)
import type { Metadata } from 'next';

// This is the root layout. It MUST contain <html> and <body> tags.

export const metadata: Metadata = {
  title: 'NextNote App',
  description: 'A Next.js, TypeScript, and Firebase note-taking app.',
};

export default function RootLayout({
  children, // This prop represents the content of the current page/route
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      {/* The body tag should be the direct child of html.
        We apply global styles like full height and background here. 
      */}
      <body className="h-screen bg-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}