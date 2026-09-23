'use client';

import { useState } from 'react';
import type { CardField } from '@/lib/types';
import { rateCard } from '@/lib/rating';
import { useStore } from '@/lib/store';
import { useHydrated } from '../useHydrated';
import { ConsentCheckbox, LevelBadge, RatingPanel, TechSpecView } from '@/components/domain';
import { Badge, Button, Input, Textarea } from '@/components/ui';

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
    <div className="grid gap-6 md:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        <header className="space-y-2">
          <p className="text-sm text-muted">{card.businessName} · {card.industry} · {card.topic}</p>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-extrabold">{card.fields.title}</h1>
            <LevelBadge level={rating.level} />
          </div>
          {card.skillsNeeded.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {card.skillsNeeded.map((s) => <Badge key={s}>{s}</Badge>)}
            </div>
          )}
        </header>
        <section className="space-y-3">
          {FIELD_LABELS.map(([k, label]) => (
            <div key={k}>
              <h3 className="font-medium">{label}</h3>
              <p className="text-sm">{card.fields[k] ?? <span className="text-muted">Not provided</span>}</p>
            </div>
          ))}
        </section>
        <section className="space-y-2">
          <h2 className="text-xl font-extrabold">Technical documentation</h2>
          {card.techSpec ? <TechSpecView spec={card.techSpec} /> : <p className="text-sm text-muted">Not provided yet.</p>}
        </section>
      </div>
      <aside className="space-y-4 md:sticky md:top-6 md:self-start">
        <RatingPanel rating={rating} showVagueness={false} maxActions={0} />
        <ProposalForm taskId={card.id} />
      </aside>
    </div>
  );
}

function ProposalForm({ taskId }: { taskId: string }) {
  const { role, currentTeamId, teams, proposals, submitProposal } = useStore();
  const team = teams.find((t) => t.id === currentTeamId);
  const existing = proposals.find((p) => p.taskId === taskId && p.teamId === currentTeamId);
  const [form, setForm] = useState({ idea: '', plan: '', deadline: '', prototypeUrl: '' });
  const [agree, setAgree] = useState(false);

  if (role !== 'student' || !team) {
    return <p className="text-sm text-muted">Switch to Student to submit a proposal.</p>;
  }
  if (existing) {
    return (
      <div className="rounded-control bg-accent-soft p-3 text-sm">
        {team.name} already submitted a proposal — status: <b>{existing.status}</b>
        {existing.rejectReason && <div className="mt-1 text-muted">Feedback: {existing.rejectReason}</div>}
      </div>
    );
  }

  const checks = proposalChecks(form);
  const valid = checks.every((c) => c.ok);
  return (
    <section className="space-y-2 rounded-control border-2 border-border bg-surface p-4 shadow-card">
      <h2 className="text-lg font-extrabold">Send a proposal as {team.name}</h2>
      <Textarea className="h-20" placeholder="Idea"
        value={form.idea} onChange={(e) => setForm({ ...form, idea: e.target.value })} />
      <Textarea className="h-24" placeholder="Plan"
        value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })} />
      <div className="flex flex-wrap gap-2 text-sm">
        <Input type="date"
          value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
        <Input className="flex-1" placeholder="Prototype link"
          value={form.prototypeUrl} onChange={(e) => setForm({ ...form, prototypeUrl: e.target.value })} />
      </div>
      <ul className="text-xs">
        {checks.map((c) => (
          <li key={c.label} className={c.ok ? 'text-[#365314]' : 'text-muted'}>{c.ok ? '✓' : '○'} {c.label}</li>
        ))}
      </ul>
      <ConsentCheckbox required checked={agree} onChange={setAgree}>
        Our team agrees to the <a href="/legal/terms" target="_blank" className="underline">terms of use</a>.
      </ConsentCheckbox>
      <Button disabled={!valid || !agree}
        onClick={() => submitProposal({ taskId, teamId: team.id, ...form })}>
        Send proposal
      </Button>
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
