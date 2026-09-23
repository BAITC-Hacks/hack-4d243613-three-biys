import Link from 'next/link';
import { Logo } from '@/components/ui/logo';

export default function Home() {
  return (
    <div className="space-y-6 py-10">
      <h1><Logo size="lg" /></h1>
      <p className="max-w-2xl text-lg text-muted">
        Find the problem worth solving, turn it into a task card students can start on, and watch its readiness rating grow.
      </p>
      <div className="flex gap-3">
        <Link href="/business/new" className="inline-flex items-center gap-2 rounded-control bg-primary px-4 py-2 font-semibold text-primary-foreground"><span className="led" />Describe a task</Link>
        <Link href="/business/discover" className="rounded-control border-2 border-border px-4 py-2">Discover problems</Link>
        <Link href="/catalog" className="rounded-control border-2 border-border px-4 py-2">Browse projects</Link>
      </div>
    </div>
  );
}
