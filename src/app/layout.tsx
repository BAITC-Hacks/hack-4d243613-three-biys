// Root layout — owner: C. Nav placeholder; C adds the role switcher + team picker.
import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'TaskForge',
  description: 'Turn business needs into rated, student-ready task cards.',
};

const nav = [
  ['/', 'Home'],
  ['/business/discover', 'Discover'],
  ['/business/new', 'New task'],
  ['/business/tasks', 'My tasks'],
  ['/catalog', 'Catalog'],
  ['/student', 'Student'],
] as const;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <header className="border-b border-border">
          <nav className="mx-auto flex max-w-5xl gap-4 px-4 py-3 text-sm">
            <span className="font-semibold">TaskForge</span>
            {nav.map(([href, label]) => <Link key={href} href={href}>{label}</Link>)}
          </nav>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
