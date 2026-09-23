'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { useHydrated } from '../useHydrated';
import { ProposalCompare } from '@/components/domain';
import { CardEditor } from '../constructor/CardEditor';
import { Button, Input, Select, Tabs } from '@/components/ui';

export function TaskDetail({ id }: { id: string }) {
  const hydrated = useHydrated();
  const card = useStore((s) => s.cards.find((c) => c.id === id));
  const [tab, setTab] = useState<'proposals' | 'card'>('proposals');
  const proposalCount = useStore((s) => s.proposals.filter((p) => p.taskId === id).length);
  if (!hydrated) return null;
  if (!card) return <p>Task not found.</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">{card.fields.title ?? 'Untitled draft'}</h1>
      <Tabs
        aria-label="Task sections"
        items={[
          { id: 'proposals', label: 'Proposals & milestones', count: proposalCount },
          { id: 'card', label: 'Edit card' },
        ]}
        value={tab}
        onChange={setTab}
      />
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
            <Select  value={draft.teamId}
              onChange={(e) => setDraft({ ...draft, teamId: e.target.value })}>
              <option value="">Team…</option>
              {accepted.map((p) => (
                <option key={p.teamId} value={p.teamId}>{teams.find((t) => t.id === p.teamId)?.name}</option>
              ))}
            </Select>
            <Input className="flex-1" placeholder="Milestone title"
              value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            <Input type="number" min={1} className="w-20"
              value={draft.points} onChange={(e) => setDraft({ ...draft, points: Number(e.target.value) })} />
            <Button disabled={!draft.teamId || !draft.title.trim()}
              onClick={() => { addMilestone({ taskId, ...draft }); setDraft({ ...draft, title: '' }); }}>
              Add milestone
            </Button>
          </div>
        )}
        <ul className="space-y-2 text-sm">
          {milestones.filter((m) => m.taskId === taskId).map((m) => (
            <li key={m.id} className="flex items-center gap-3 rounded-control border-2 border-border bg-surface p-2">
              <span className="flex-1">{m.title} · {teams.find((t) => t.id === m.teamId)?.name} · {m.points} pts</span>
              {m.confirmedByBusiness ? (
                <span className="text-[#365314]">Confirmed · team total {teamPoints[m.teamId] ?? 0} pts</span>
              ) : (
                <Button variant="accent" onClick={() => confirmMilestone(m.id)}>
                  Confirm milestone
                </Button>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
