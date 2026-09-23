import Link from 'next/link';
import { Logo } from '@/components/ui/logo';
import { buttonClasses } from '@/components/ui';

export default function Home() {
  return (
    <div className="space-y-6 py-10">
      <h1><Logo size="lg" /></h1>
      <p className="max-w-2xl text-lg text-muted">
        Find the problem worth solving, turn it into a task card students can start on, and watch its readiness rating grow.
      </p>
      <div className="flex gap-3">
        <Link href="/business/new" className={buttonClasses()}>Describe a task</Link>
        <Link href="/business/discover" className={buttonClasses({ variant: 'secondary' })}>Discover problems</Link>
        <Link href="/catalog" className={buttonClasses({ variant: 'secondary' })}>Browse projects</Link>
      </div>
    </div>
  );
}
