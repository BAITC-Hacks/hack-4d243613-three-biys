'use client';

import Link from 'next/link';
import { rateCard } from '@/lib/rating';
import { useStore } from '@/lib/store';
import { useHydrated } from '../useHydrated';
import { LevelBadge } from '@/components/domain';
import { buttonClasses } from '@/components/ui';

export function TaskList() {
  const hydrated = useHydrated();
  const { cards, proposals } = useStore();
  if (!hydrated) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">My tasks</h1>
        <Link href="/business/new" className={buttonClasses()}>New task</Link>
      </div>
      {cards.length === 0 && <p className="text-muted">No tasks yet — start in the Constructor or Discover.</p>}
      <table className="w-full text-sm">
        <thead className="text-left text-muted">
          <tr><th className="py-2">Task</th><th>Status</th><th>Rating</th><th>Proposals</th></tr>
        </thead>
        <tbody>
          {cards.map((c) => {
            const r = rateCard(c);
            const ps = proposals.filter((p) => p.taskId === c.id);
            const pending = ps.filter((p) => p.status === 'pending').length;
            return (
              <tr key={c.id} className="border-t">
                <td className="py-2">
                  <Link href={`/business/tasks/${c.id}`} className="underline">{c.fields.title ?? 'Untitled draft'}</Link>
                </td>
                <td>{c.status}</td>
                <td className="flex items-center gap-2 py-2">{r.total} <LevelBadge level={r.level} /></td>
                <td>{ps.length}{pending > 0 && <span className="ml-1 text-amber-700">({pending} new)</span>}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
