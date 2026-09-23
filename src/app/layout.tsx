import type { Metadata } from 'next';
import './globals.css';
import { AppHeader } from '@/components/features/AppHeader';

export const metadata: Metadata = {
  title: 'Көпір',
  description: 'Turn business needs into ready tasks for student teams',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-screen bg-background text-foreground">
        <AppHeader />
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
