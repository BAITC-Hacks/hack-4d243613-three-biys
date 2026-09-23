'use client';

import type { Milestone, TaskCard } from '@/lib/types';
import { ProgressBar } from '@/components/ui';

// HACK: team levels for the student "progress as a game" view. Points come only from business-confirmed milestones.
const LEVEL_AT = [0, 40, 80, 160, 320, 640];

export function teamLevel(points: number) {
  let level = 1;
  for (let i = 0; i < LEVEL_AT.length; i++) if (points >= LEVEL_AT[i]) level = i + 1;
  const next = LEVEL_AT[level] as number | undefined;
  return { level, next };
}

export function TeamProgress({ points }: { points: number }) {
  const { level, next } = teamLevel(points);
  return (
    <section className="space-y-2 rounded-control border-2 border-border bg-surface p-4 shadow-card">
      <div className="flex items-baseline justify-between gap-4">
        <span className="font-display text-3xl font-extrabold">Level {level}</span>
        <span className="text-sm text-muted">
          {next != null ? `${points} of ${next} points to level ${level + 1}` : `${points} points · max level`}
        </span>
      </div>
      <ProgressBar value={points} max={next ?? points} label={`Team level ${level}`} />
    </section>
  );
}

export function Quests({ milestones, cards }: { milestones: Milestone[]; cards: TaskCard[] }) {
  if (milestones.length === 0) {
    return <p className="text-sm text-muted">No quests yet — once a business accepts your proposal, its milestones appear here.</p>;
  }
  return (
    <ul className="divide-y-2 divide-hairline rounded-control border-2 border-border bg-surface">
      {milestones.map((m) => {
        const task = cards.find((c) => c.id === m.taskId)?.fields.title ?? m.taskId;
        return (
          <li key={m.id} className="flex items-center gap-3 px-4 py-3">
            <span
              aria-hidden="true"
              className={`grid size-5 shrink-0 place-items-center border-2 border-border text-xs font-bold ${m.confirmedByBusiness ? 'bg-accent' : 'bg-surface'}`}
            >
              {m.confirmedByBusiness ? '✓' : ''}
            </span>
            <span className="flex-1">
              <span className="font-medium">{m.title}</span>
              <span className="block text-xs text-muted">{task} · {m.confirmedByBusiness ? 'confirmed by business' : 'waiting for business confirmation'}</span>
            </span>
            <span className={`font-display font-extrabold ${m.confirmedByBusiness ? '' : 'text-muted'}`}>+{m.points}</span>
          </li>
        );
      })}
    </ul>
  );
}
