// Seed data loader (synthetic, no real personal data). Owner: A. Full seed lands in H2.
import type { Insight, Proposal, TaskCard, TeamProfile } from '@/lib/types';
import drafts from './drafts.json';
import cards from './cards.json';
import teams from './teams.json';
import proposals from './proposals.json';

export interface SeedDraft { id: string; industry: string; businessName: string; text: string }

export const seedDrafts = drafts as SeedDraft[];
export const seedCards = cards as TaskCard[];
export const seedTeams = teams as TeamProfile[];
export const seedProposals = proposals as Proposal[];
export const seedInsights: Insight[] = [];
