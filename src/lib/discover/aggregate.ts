// k-anonymous weekly aggregation of activity events. Pure function. Owner: A.
//
// Privacy rules: events are grouped per team + ISO week; `user` (a server-side device hash) is only used to
// count distinct contributors and is never output. A team-week is reported only if it has ≥ k contributors, and
// each transfer/switch pattern inside it is reported only if ≥ k distinct contributors produced it.
import type { AppCategory, PrivacyStats, RawActivityEvent, TeamWeekAggregate } from '@/lib/types';

export function isoWeek(dateIso: string): string {
  const d = new Date(dateIso);
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = Date.UTC(t.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((t.getTime() - yearStart) / 86400000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

interface PatternAcc { count: number; users: Set<string> }

export function aggregateActivity(
  events: RawActivityEvent[],
  k = 5,
): { aggregates: TeamWeekAggregate[]; privacy: PrivacyStats } {
  const groups = new Map<string, { team: string; week: string; users: Set<string>; hours: Map<AppCategory, number>; transfers: Map<string, PatternAcc>; switches: Map<string, PatternAcc> }>();

  for (const e of events) {
    if (!e.team || !e.user || !e.ts) continue;
    const week = isoWeek(e.ts);
    const key = `${e.team}|${week}`;
    let g = groups.get(key);
    if (!g) {
      g = { team: e.team, week, users: new Set(), hours: new Map(), transfers: new Map(), switches: new Map() };
      groups.set(key, g);
    }
    g.users.add(e.user);
    if (e.event === 'focus' && e.app) {
      g.hours.set(e.app, (g.hours.get(e.app) ?? 0) + (e.durationSec ?? 0) / 3600);
    } else if (e.event === 'transfer' && e.from && e.to) {
      const pk = `${e.from}>${e.to}`;
      const p = g.transfers.get(pk) ?? { count: 0, users: new Set() };
      p.count++; p.users.add(e.user); g.transfers.set(pk, p);
    } else if (e.event === 'switch' && e.from && e.to) {
      const [a, b] = [e.from, e.to].sort();
      const pk = `${a}|${b}`;
      const p = g.switches.get(pk) ?? { count: 0, users: new Set() };
      p.count++; p.users.add(e.user); g.switches.set(pk, p);
    }
  }

  const aggregates: TeamWeekAggregate[] = [];
  let suppressedPatterns = 0;
  const teamsReported = new Set<string>();
  const teamsSuppressed = new Set<string>();

  for (const g of groups.values()) {
    if (g.users.size < k) {
      teamsSuppressed.add(g.team);
      suppressedPatterns += g.transfers.size + g.switches.size;
      continue;
    }
    teamsReported.add(g.team);
    const hoursByCategory: Partial<Record<AppCategory, number>> = {};
    for (const [cat, h] of g.hours) hoursByCategory[cat] = Math.round(h * 10) / 10;

    const transfers = [...g.transfers.entries()]
      .filter(([, p]) => { const ok = p.users.size >= k; if (!ok) suppressedPatterns++; return ok; })
      .map(([pk, p]) => { const [from, to] = pk.split('>') as [AppCategory, AppCategory]; return { from, to, count: p.count, contributors: p.users.size }; })
      .sort((a, b) => b.count - a.count);

    const topSwitches = [...g.switches.entries()]
      .filter(([, p]) => { const ok = p.users.size >= k; if (!ok) suppressedPatterns++; return ok; })
      .map(([pk, p]) => { const [a, b] = pk.split('|') as [AppCategory, AppCategory]; return { a, b, count: p.count, contributors: p.users.size }; })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    aggregates.push({ team: g.team, week: g.week, contributors: g.users.size, hoursByCategory, transfers, topSwitches });
  }
  for (const t of teamsReported) teamsSuppressed.delete(t);

  aggregates.sort((a, b) => a.team.localeCompare(b.team) || a.week.localeCompare(b.week));
  return {
    aggregates,
    privacy: {
      rawEvents: events.length, individualsIdentified: 0, k,
      suppressedPatterns, teamsReported: teamsReported.size, teamsSuppressed: teamsSuppressed.size,
    },
  };
}
