import Link from 'next/link';

export default function Home() {
  return (
    <div className="space-y-6 py-10">
      <h1 className="text-4xl font-bold">TaskForge</h1>
      <p className="max-w-2xl text-lg text-gray-600">
        Find the problem worth solving, turn it into a task card students can start on, and watch its readiness rating grow.
      </p>
      <div className="flex gap-3">
        <Link href="/business/discover" className="rounded bg-blue-600 px-4 py-2 text-white">I&apos;m a business</Link>
        <Link href="/catalog" className="rounded border px-4 py-2">Browse projects</Link>
      </div>
    </div>
  );
}
