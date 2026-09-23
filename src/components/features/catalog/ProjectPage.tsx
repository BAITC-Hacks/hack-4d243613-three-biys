'use client';

import { useState } from 'react';
import type { CardField } from '@/lib/types';
import { rateCard } from '@/lib/rating';
import { useStore } from '@/lib/store';
import { useHydrated } from '../useHydrated';
import { LevelBadge, RatingPanel, TechSpecView } from '@/components/domain';

const FIELD_LABELS: [CardField, string][] = [
  ['context', 'Context'], ['need', 'Need'], ['users', 'Users'], ['data', 'Data & materials'],
  ['constraints', 'Constraints'], ['expectedResult', 'Expected result'],
  ['successCriteria', 'Success criteria'], ['contact', 'Contact & format'],
];

export function ProjectPage({ id }: { id: string }) {
  const hydrated = useHydrated();
  const card = useStore((s) => s.cards.find((c) => c.id === id));
  if (!hydrated) return null;
  if (!card || card.status !== 'published') return <p>Project not found.</p>;
  const rating = rateCard(card);

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{card.fields.title}</h1>
            <LevelBadge level={rating.level} />
          </div>
          <p className="text-sm text-muted">{card.businessName} · {card.industry} · {card.topic}</p>
        </div>
        <section className="space-y-3">
          {FIELD_LABELS.map(([k, label]) => (
            <div key={k}>
              <h3 className="font-medium">{label}</h3>
              <p className="text-sm">{card.fields[k] ?? <span className="text-muted">Not provided</span>}</p>
            </div>
          ))}
        </section>
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Technical documentation</h2>
          {card.techSpec ? <TechSpecView spec={card.techSpec} /> : <p className="text-sm text-muted">Not provided yet.</p>}
        </section>
        <ProposalForm taskId={card.id} />
      </div>
      <aside><RatingPanel rating={rating} /></aside>
    </div>
  );
}

function ProposalForm({ taskId }: { taskId: string }) {
  const { role, currentTeamId, teams, proposals, submitProposal } = useStore();
  const team = teams.find((t) => t.id === currentTeamId);
  const existing = proposals.find((p) => p.taskId === taskId && p.teamId === currentTeamId);
  const [form, setForm] = useState({ idea: '', plan: '', deadline: '', prototypeUrl: '' });

  if (role !== 'student' || !team) {
    return <p className="text-sm text-muted">Switch to Student to submit a proposal.</p>;
  }
  if (existing) {
    return (
      <div className="rounded bg-accent-soft p-3 text-sm">
        {team.name} already submitted a proposal — status: <b>{existing.status}</b>
        {existing.rejectReason && <div className="mt-1 text-muted">Feedback: {existing.rejectReason}</div>}
      </div>
    );
  }

  const checks = proposalChecks(form);
  const valid = checks.every((c) => c.ok);
  return (
    <section className="space-y-2 rounded border border-border p-4">
      <h2 className="text-xl font-semibold">Submit a proposal as {team.name}</h2>
      <textarea className="h-20 w-full rounded border border-border p-2 text-sm" placeholder="Idea"
        value={form.idea} onChange={(e) => setForm({ ...form, idea: e.target.value })} />
      <textarea className="h-24 w-full rounded border border-border p-2 text-sm" placeholder="Plan"
        value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })} />
      <div className="flex flex-wrap gap-2 text-sm">
        <input type="date" className="rounded border border-border px-2 py-1"
          value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
        <input className="flex-1 rounded border border-border px-2 py-1" placeholder="Prototype link"
          value={form.prototypeUrl} onChange={(e) => setForm({ ...form, prototypeUrl: e.target.value })} />
      </div>
      <ul className="text-xs">
        {checks.map((c) => (
          <li key={c.label} className={c.ok ? 'text-[#365314]' : 'text-muted'}>{c.ok ? '✓' : '○'} {c.label}</li>
        ))}
      </ul>
      <button disabled={!valid} className="rounded bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
        onClick={() => submitProposal({ taskId, teamId: team.id, ...form })}>
        Submit proposal
      </button>
    </section>
  );
}

function isHttpUrl(s: string) {
  try {
    return ['http:', 'https:'].includes(new URL(s).protocol);
  } catch {
    return false;
  }
}

// Proposal completeness check: required fields, valid prototype link, future deadline.
function proposalChecks(f: { idea: string; plan: string; deadline: string; prototypeUrl: string }) {
  const today = new Date().toISOString().slice(0, 10);
  return [
    { label: 'Idea described (20+ characters)', ok: f.idea.trim().length >= 20 },
    { label: 'Plan described (20+ characters)', ok: f.plan.trim().length >= 20 },
    { label: 'Deadline is in the future', ok: !!f.deadline && f.deadline > today },
    { label: 'Prototype link is a valid http(s) URL', ok: isHttpUrl(f.prototypeUrl.trim()) },
  ];
}
