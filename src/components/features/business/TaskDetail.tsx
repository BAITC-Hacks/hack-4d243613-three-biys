'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { useHydrated } from '../useHydrated';
import { ProposalCard } from '@/components/domain';
import { CardEditor } from '../constructor/CardEditor';

export function TaskDetail({ id }: { id: string }) {
  const hydrated = useHydrated();
  const card = useStore((s) => s.cards.find((c) => c.id === id));
  const [tab, setTab] = useState<'proposals' | 'card'>('proposals');
  if (!hydrated) return null;
  if (!card) return <p>Task not found.</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{card.fields.title ?? 'Untitled draft'}</h1>
      <div className="flex gap-2 border-b">
        {(['proposals', 'card'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-2 capitalize ${tab === t ? 'border-b-2 border-blue-600 font-semibold' : 'text-gray-500'}`}>
            {t === 'card' ? 'Edit card' : 'Proposals & milestones'}
          </button>
        ))}
      </div>
      {tab === 'card' ? <CardEditor cardId={card.id} /> : <Proposals taskId={card.id} />}
    </div>
  );
}

function Proposals({ taskId }: { taskId: string }) {
  const { proposals, teams, milestones, teamPoints, decideProposal, addMilestone, confirmMilestone } = useStore();
  const list = proposals.filter((p) => p.taskId === taskId);
  const accepted = list.filter((p) => p.status === 'accepted');
  const [draft, setDraft] = useState({ teamId: '', title: '', points: 50 });

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Proposals ({list.length})</h2>
        <p className="text-xs text-gray-500">You decide — accept one, several or none. Nothing is assigned automatically.</p>
        {list.length === 0 && <p className="text-sm text-gray-500">No proposals yet.</p>}
        <div className="grid gap-3 md:grid-cols-2">
          {list.map((p) => {
            const team = teams.find((t) => t.id === p.teamId);
            if (!team) return null;
            return (
              <ProposalCard key={p.id} proposal={p} team={team}
                onAccept={() => decideProposal(p.id, 'accepted')}
                onReject={() => decideProposal(p.id, 'rejected')} />
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Milestones</h2>
        {accepted.length === 0 ? (
          <p className="text-sm text-gray-500">Accept a proposal to add milestones.</p>
        ) : (
          <div className="flex flex-wrap items-end gap-2 text-sm">
            <select className="rounded border px-2 py-1" value={draft.teamId}
              onChange={(e) => setDraft({ ...draft, teamId: e.target.value })}>
              <option value="">Team…</option>
              {accepted.map((p) => (
                <option key={p.teamId} value={p.teamId}>{teams.find((t) => t.id === p.teamId)?.name}</option>
              ))}
            </select>
            <input className="flex-1 rounded border px-2 py-1" placeholder="Milestone title"
              value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            <input type="number" min={1} className="w-20 rounded border px-2 py-1"
              value={draft.points} onChange={(e) => setDraft({ ...draft, points: Number(e.target.value) })} />
            <button disabled={!draft.teamId || !draft.title.trim()}
              className="rounded bg-blue-600 px-3 py-1 text-white disabled:opacity-50"
              onClick={() => { addMilestone({ taskId, ...draft }); setDraft({ ...draft, title: '' }); }}>
              Add milestone
            </button>
          </div>
        )}
        <ul className="space-y-2 text-sm">
          {milestones.filter((m) => m.taskId === taskId).map((m) => (
            <li key={m.id} className="flex items-center gap-3 rounded border p-2">
              <span className="flex-1">{m.title} · {teams.find((t) => t.id === m.teamId)?.name} · {m.points} pts</span>
              {m.confirmedByBusiness ? (
                <span className="text-green-700">Confirmed · team total {teamPoints[m.teamId] ?? 0} pts</span>
              ) : (
                <button className="rounded bg-green-600 px-3 py-1 text-white" onClick={() => confirmMilestone(m.id)}>
                  Confirm milestone
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
