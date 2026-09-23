'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useStore, type Role } from '@/lib/store';
import { useHydrated } from './useHydrated';

const NAV: Record<Role, { href: string; label: string }[]> = {
  business: [
    { href: '/business/discover', label: 'Discover' },
    { href: '/business/new', label: 'Constructor' },
    { href: '/business/tasks', label: 'My tasks' },
    { href: '/catalog', label: 'Catalog' },
  ],
  student: [
    { href: '/student', label: 'My team' },
    { href: '/student/profile', label: 'Team profile' },
    { href: '/catalog', label: 'Catalog' },
  ],
};

export function AppHeader() {
  const hydrated = useHydrated();
  const pathname = usePathname();
  const router = useRouter();
  const { role, setRole, teams, currentTeamId, setTeam, resetDemo } = useStore();

  const switchRole = (r: Role) => {
    setRole(r);
    router.push(r === 'business' ? '/business/tasks' : '/student');
  };

  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-3">
        <Link href="/" className="text-lg font-bold">TaskForge</Link>
        {hydrated && (
          <>
            <nav className="flex flex-wrap gap-3 text-sm">
              {NAV[role].map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className={pathname === n.href ? 'font-semibold underline' : 'text-gray-600'}
                >
                  {n.label}
                </Link>
              ))}
            </nav>
            <div className="ml-auto flex items-center gap-2 text-sm">
              <div className="flex rounded border">
                {(['business', 'student'] as Role[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => switchRole(r)}
                    className={`px-3 py-1 capitalize ${role === r ? 'bg-gray-900 text-white' : ''}`}
                  >
                    {r}
                  </button>
                ))}
              </div>
              {role === 'student' && (
                <select
                  className="rounded border px-2 py-1"
                  value={currentTeamId}
                  onChange={(e) => setTeam(e.target.value)}
                >
                  {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              )}
              <button
                className="text-xs text-gray-500 underline"
                onClick={() => { if (confirm('Reset demo data?')) resetDemo(); }}
              >
                Reset demo
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
