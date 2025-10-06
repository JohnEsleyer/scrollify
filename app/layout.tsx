
import './globals.css'; 
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Scrollify',
  description: '',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="h-screen bg-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}