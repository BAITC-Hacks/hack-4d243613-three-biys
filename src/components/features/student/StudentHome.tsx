'use client';

import Link from 'next/link';
import { rateCard } from '@/lib/rating';
import { matchTasks } from '@/lib/catalog';
import { useStore } from '@/lib/store';
import { useHydrated } from '../useHydrated';
import { Leaderboard, ProjectCard, TeamCard } from '@/components/domain';
import type { Match, TaskCard, TeamProfile } from '@/lib/types';
import { useAiReasons } from './useAiReasons';

function Matches({ team, matches, cards }: { team: TeamProfile; matches: Match[]; cards: TaskCard[] }) {
  const ai = useAiReasons(team, matches, cards);
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {matches.map((m) => {
        const card = cards.find((c) => c.id === m.taskId)!;
        return (
          <Link key={m.taskId} href={`/catalog/${m.taskId}`} className="space-y-2">
            <ProjectCard card={card} rating={rateCard(card)} />
            <ul className="text-xs text-green-800">{m.reasons.map((r) => <li key={r}>✓ {r}</li>)}</ul>
            {ai[m.taskId] && <p className="text-xs text-gray-600">AI: {ai[m.taskId]}</p>}
          </Link>
        );
      })}
    </div>
  );
}

export function StudentHome() {
  const hydrated = useHydrated();
  const { teams, currentTeamId, teamPoints, cards, proposals } = useStore();
  if (!hydrated) return null;
  const team = teams.find((t) => t.id === currentTeamId);
  if (!team) return <p>No team selected.</p>;

  const matches = matchTasks(team, cards);
  const mine = proposals.filter((p) => p.teamId === team.id);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1"><TeamCard team={team} points={teamPoints[team.id] ?? 0} /></div>
        <Link href="/student/profile" className="rounded border px-3 py-1 text-sm">Edit profile</Link>
      </div>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Projects you can take</h2>
        <p className="text-sm text-gray-500">
          Suggestions only — the full <Link href="/catalog" className="underline">catalog</Link> is always open to you.
        </p>
        {matches.length === 0 && <p className="text-sm text-gray-500">No matches yet — add interests or skills to your profile.</p>}
        <Matches team={team} matches={matches} cards={cards} />
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Leaderboard</h2>
        <p className="text-xs text-gray-500">Points come only from milestones confirmed by the business — never for applying.</p>
        <Leaderboard teams={teams} points={teamPoints} />
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Our proposals</h2>
        {mine.length === 0 && <p className="text-sm text-gray-500">None yet.</p>}
        <ul className="space-y-1 text-sm">
          {mine.map((p) => (
            <li key={p.id}>
              <Link href={`/catalog/${p.taskId}`} className="underline">
                {cards.find((c) => c.id === p.taskId)?.fields.title ?? p.taskId}
              </Link>{' '}— {p.status}
              {p.rejectReason && <span className="text-gray-500"> · feedback: {p.rejectReason}</span>}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
