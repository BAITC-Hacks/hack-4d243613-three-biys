// Validates seed JSON against the zod contracts and prints each card's rating. Run: npx tsx scripts/check-seed.ts
import { z } from 'zod';
import { ProposalSchema, TaskCardSchema, TeamProfileSchema } from '../src/lib/schemas';
import { rateCard } from '../src/lib/rating';
import cards from '../src/data/seed/cards.json';
import teams from '../src/data/seed/teams.json';
import proposals from '../src/data/seed/proposals.json';
import drafts from '../src/data/seed/drafts.json';

z.array(TaskCardSchema).parse(cards);
z.array(TeamProfileSchema).parse(teams);
z.array(ProposalSchema).parse(proposals);
z.array(z.object({ id: z.string(), industry: z.string(), businessName: z.string(), text: z.string() })).parse(drafts);
const teamIds = new Set(teams.map((t) => t.id)); const cardIds = new Set(cards.map((c) => c.id));
for (const p of proposals) if (!teamIds.has(p.teamId) || !cardIds.has(p.taskId)) throw new Error(`proposal ${p.id} references unknown team/card`);
for (const c of cards) { const r = rateCard(c as never); console.log(`${c.id.padEnd(20)} ${String(r.total).padStart(3)}  ${r.level}`); }
console.log(`OK: ${drafts.length} drafts, ${cards.length} cards, ${teams.length} teams, ${proposals.length} proposals`);
