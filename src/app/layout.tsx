import type { Metadata } from 'next';
import './globals.css';
import { AppHeader } from '@/components/features/AppHeader';
import { ConsentMount } from '@/components/features/ConsentMount';
import { LegalLinks } from '@/components/domain';
import { LEGAL_LIST } from '@/content/legal';

export const metadata: Metadata = {
  title: 'Көпір',
  description: 'Turn business needs into ready tasks for student teams',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-screen flex-col bg-background text-foreground">
        <AppHeader />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
        <footer className="border-t-2 border-border">
          <div className="mx-auto max-w-6xl space-y-2 px-4 py-4">
            <p className="text-xs text-muted">Documents in Russian</p>
            <LegalLinks docs={LEGAL_LIST.map(({ slug, title }) => ({ slug, title }))} />
          </div>
        </footer>
        <ConsentMount />
      </body>
    </html>
  );
}
