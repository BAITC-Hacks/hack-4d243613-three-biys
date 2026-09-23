'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { useHydrated } from '../useHydrated';
import { ProposalCompare } from '@/components/domain';
import { CardEditor } from '../constructor/CardEditor';

export function TaskDetail({ id }: { id: string }) {
  const hydrated = useHydrated();
  const card = useStore((s) => s.cards.find((c) => c.id === id));
  const [tab, setTab] = useState<'proposals' | 'card'>('proposals');
  if (!hydrated) return null;
  if (!card) return <p>Task not found.</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">{card.fields.title ?? 'Untitled draft'}</h1>
      <div className="flex gap-2">
        {(['proposals', 'card'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`border-2 border-border px-3 py-2 font-semibold ${tab === t ? 'bg-accent shadow-card' : 'bg-surface text-muted'}`}>
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
        <h2 className="text-xl font-extrabold">Proposals ({list.length})</h2>
        <p className="text-xs text-muted">You decide — accept one, several or none. Nothing is assigned automatically.</p>
        {list.length === 0 && <p className="text-sm text-muted">No proposals yet.</p>}
        <ProposalCompare
          proposals={list}
          teams={teams}
          onAccept={(id) => decideProposal(id, 'accepted')}
          onReject={(id, reason) => {
            // HACK: native prompt until B's ProposalCompare collects the reason itself.
            const r = reason ?? window.prompt('Reason for the team (optional):');
            if (r === null) return;
            decideProposal(id, 'rejected', r.trim() || undefined);
          }}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-extrabold">Milestones</h2>
        {accepted.length === 0 ? (
          <p className="text-sm text-muted">Accept a proposal to add milestones.</p>
        ) : (
          <div className="flex flex-wrap items-end gap-2 text-sm">
            <select className="rounded-control border-2 border-border bg-surface px-2 py-1" value={draft.teamId}
              onChange={(e) => setDraft({ ...draft, teamId: e.target.value })}>
              <option value="">Team…</option>
              {accepted.map((p) => (
                <option key={p.teamId} value={p.teamId}>{teams.find((t) => t.id === p.teamId)?.name}</option>
              ))}
            </select>
            <input className="flex-1 rounded-control border-2 border-border bg-surface px-2 py-1" placeholder="Milestone title"
              value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            <input type="number" min={1} className="w-20 rounded-control border-2 border-border bg-surface px-2 py-1"
              value={draft.points} onChange={(e) => setDraft({ ...draft, points: Number(e.target.value) })} />
            <button disabled={!draft.teamId || !draft.title.trim()}
              className="rounded-control bg-primary px-3 py-1 text-primary-foreground disabled:opacity-50"
              onClick={() => { addMilestone({ taskId, ...draft }); setDraft({ ...draft, title: '' }); }}>
              Add milestone
            </button>
          </div>
        )}
        <ul className="space-y-2 text-sm">
          {milestones.filter((m) => m.taskId === taskId).map((m) => (
            <li key={m.id} className="flex items-center gap-3 rounded-control border-2 border-border bg-surface p-2">
              <span className="flex-1">{m.title} · {teams.find((t) => t.id === m.teamId)?.name} · {m.points} pts</span>
              {m.confirmedByBusiness ? (
                <span className="text-[#365314]">Confirmed · team total {teamPoints[m.teamId] ?? 0} pts</span>
              ) : (
                <button className="rounded-control border-2 border-border bg-accent px-3 py-1 font-semibold text-accent-foreground shadow-card" onClick={() => confirmMilestone(m.id)}>
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
