// Generates src/data/seed/activity-events.json: ~2,000 synthetic Collector events for QazCargo over 4 weeks.
// Deterministic (seeded RNG). Teams: Sales (6 devices), Operations (5), Finance (3 → below k=5, gets suppressed).
// Run: npx tsx scripts/gen-activity.ts
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import type { AppCategory, RawActivityEvent } from '../src/lib/types';

let seed = 20260923;
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const pick = <T,>(xs: T[]) => xs[Math.floor(rnd() * xs.length)];

const teams: { team: string; users: string[]; apps: AppCategory[]; transfer: [AppCategory, AppCategory]; perWeek: number[] }[] = [
  { team: 'Sales', users: ['s1', 's2', 's3', 's4', 's5', 's6'], apps: ['CRM', 'Spreadsheet', 'Email', 'Messenger', 'Browser'], transfer: ['Spreadsheet', 'CRM'], perWeek: [118, 127, 131, 142] },
  { team: 'Operations', users: ['o1', 'o2', 'o3', 'o4', 'o5'], apps: ['ERP', 'Messenger', 'Spreadsheet', 'Email', 'Docs'], transfer: ['Messenger', 'ERP'], perWeek: [64, 71, 69, 80] },
  { team: 'Finance', users: ['f1', 'f2', 'f3'], apps: ['ERP', 'Spreadsheet', 'Email'], transfer: ['Spreadsheet', 'ERP'], perWeek: [30, 28, 33, 31] },
];
// Weeks 2026-W35..W38 (Mon 24 Aug … Fri 18 Sep 2026)
const weekStarts = ['2026-08-24', '2026-08-31', '2026-09-07', '2026-09-14'];

const events: RawActivityEvent[] = [];
const ts = (weekStart: string, day: number, hour: number, minute: number) =>
  new Date(`${weekStart}T00:00:00Z`).getTime() + ((day * 24 + hour) * 60 + minute) * 60000;

for (const t of teams) {
  weekStarts.forEach((ws, wi) => {
    // focus sessions: each user, each weekday, ~6 sessions
    for (const u of t.users) {
      for (let day = 0; day < 5; day++) {
        let minute = 9 * 60 + Math.floor(rnd() * 30);
        let prev: AppCategory | null = null;
        for (let s = 0; s < 6; s++) {
          const app = pick(t.apps);
          const durationSec = 15 * 60 + Math.floor(rnd() * 50 * 60);
          const when = new Date(ts(ws, day, 0, minute)).toISOString();
          events.push({ ts: when, event: 'focus', app, durationSec, user: `dev-${u}`, team: t.team });
          if (prev && prev !== app) events.push({ ts: when, event: 'switch', from: prev, to: app, user: `dev-${u}`, team: t.team });
          prev = app;
          minute += Math.floor(durationSec / 60) + 1;
        }
      }
    }
    // transfers: spread the weekly count over users and weekdays, 08:00–18:00
    const n = t.perWeek[wi];
    for (let i = 0; i < n; i++) {
      const u = t.users[i % t.users.length];
      const day = Math.floor(rnd() * 5);
      const when = new Date(ts(ws, day, 8 + Math.floor(rnd() * 10), Math.floor(rnd() * 60))).toISOString();
      events.push({ ts: when, event: 'transfer', from: t.transfer[0], to: t.transfer[1], user: `dev-${u}`, team: t.team });
    }
  });
}
events.sort((a, b) => a.ts.localeCompare(b.ts));
const out = path.join(__dirname, '..', 'src', 'data', 'seed', 'activity-events.json');
writeFileSync(out, JSON.stringify(events));
console.log(`wrote ${events.length} events → ${out}`);
