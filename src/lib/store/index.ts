// Browser store — owner: C. Contract signatures (PLAN.md §5); C fills in the real implementation.
'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import type { CardField, CardFields, Insight, Milestone, Proposal, TaskCard, TeamProfile, TechSpec } from '@/lib/types';
import { seedCards, seedInsights, seedProposals, seedTeams } from '@/data/seed';
import { rateCard } from '@/lib/rating';

export interface StoreState {
  role: 'business' | 'student';
  currentTeamId: string;
  cards: TaskCard[];
  teams: TeamProfile[];
  proposals: Proposal[];
  milestones: Milestone[];
  teamPoints: Record<string, number>;
  insights: Insight[];

  setRole: (role: 'business' | 'student') => void;
  setTeam: (id: string) => void;
  updateTeam: (id: string, patch: Partial<TeamProfile>) => void;
  createCard: (partial: Partial<TaskCard>) => string;
  updateFields: (id: string, patch: Partial<CardFields>) => void;
  confirmField: (id: string, field: CardField, confirmed: boolean) => void;
  setTechSpec: (id: string, spec: TechSpec, skills: string[]) => void;
  confirmTechSpec: (id: string) => void;
  publish: (id: string) => void;
  submitProposal: (p: Omit<Proposal, 'id' | 'status' | 'createdAt'>) => string;
  acceptSuggestion: (id: string, field: CardField) => void;
  decideProposal: (id: string, decision: 'accepted' | 'rejected', rejectReason?: string) => void;
  addMilestone: (m: Omit<Milestone, 'id' | 'confirmedByBusiness'>) => void;
  confirmMilestone: (id: string) => void;
  setInsights: (list: Insight[]) => void;
  resetDemo: () => void;
}

const emptyFields: CardFields = {
  title: null, context: null, need: null, users: null, data: null,
  constraints: null, expectedResult: null, successCriteria: null, contact: null,
};

function seedState() {
  return {
    role: 'business' as const,
    currentTeamId: seedTeams[0]?.id ?? '',
    cards: seedCards,
    teams: seedTeams,
    proposals: seedProposals,
    milestones: [] as Milestone[],
    teamPoints: {} as Record<string, number>,
    insights: seedInsights,
  };
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      ...seedState(),
      setRole: (role) => set({ role }),
      setTeam: (currentTeamId) => set({ currentTeamId }),
      updateTeam: (id, patch) => set({ teams: get().teams.map((t) => (t.id === id ? { ...t, ...patch } : t)) }),
      createCard: (partial) => {
        const id = partial.id ?? nanoid(8);
        const now = new Date().toISOString();
        const card: TaskCard = {
          id, businessName: '', industry: '', topic: '', skillsNeeded: [], draftText: '',
          fields: { ...emptyFields }, confirmed: {}, fieldSource: {}, techSpec: null, techSpecConfirmed: false,
          status: 'draft', origin: { kind: 'manual' }, history: [], suggestions: {}, createdAt: now, updatedAt: now, ...partial,
        };
        set({ cards: [...get().cards, card] });
        return id;
      },
      updateFields: (id, patch) => set({
        cards: get().cards.map((c) => (c.id === id ? { ...c, fields: { ...c.fields, ...patch }, updatedAt: new Date().toISOString() } : c)),
      }),
      confirmField: (id, field, confirmed) => set({
        cards: get().cards.map((c) => {
          if (c.id !== id) return c;
          const next = { ...c, confirmed: { ...c.confirmed, [field]: confirmed } };
          const r = rateCard(next);
          return { ...next, history: [...c.history, { ts: new Date().toISOString(), total: r.total, level: r.level, note: `${confirmed ? 'confirmed' : 'unconfirmed'} ${field}` }] };
        }),
      }),
      acceptSuggestion: (id, field) => set({
        cards: get().cards.map((c) => {
          const s = c.suggestions[field];
          if (c.id !== id || !s) return c;
          const { [field]: _dropped, ...rest } = c.suggestions;
          return { ...c, fields: { ...c.fields, [field]: s.text }, fieldSource: { ...c.fieldSource, [field]: 'insight' }, suggestions: rest };
        }),
      }),
      setTechSpec: (id, techSpec, skillsNeeded) => set({
        cards: get().cards.map((c) => (c.id === id ? { ...c, techSpec, skillsNeeded, techSpecConfirmed: false } : c)),
      }),
      confirmTechSpec: (id) => set({ cards: get().cards.map((c) => (c.id === id ? { ...c, techSpecConfirmed: true } : c)) }),
      publish: (id) => set({
        cards: get().cards.map((c) => (c.id === id ? { ...c, status: 'published', publishedAt: new Date().toISOString() } : c)),
      }),
      submitProposal: (p) => {
        const id = nanoid(8);
        set({ proposals: [...get().proposals, { ...p, id, status: 'pending', createdAt: new Date().toISOString() }] });
        return id;
      },
      decideProposal: (id, status, rejectReason) => set({
        proposals: get().proposals.map((p) => (p.id === id ? { ...p, status, rejectReason, decidedAt: new Date().toISOString() } : p)),
      }),
      addMilestone: (m) => set({ milestones: [...get().milestones, { ...m, id: nanoid(8), confirmedByBusiness: false }] }),
      confirmMilestone: (id) => {
        const m = get().milestones.find((x) => x.id === id);
        if (!m || m.confirmedByBusiness) return;
        set({
          milestones: get().milestones.map((x) => (x.id === id ? { ...x, confirmedByBusiness: true, confirmedAt: new Date().toISOString() } : x)),
          teamPoints: { ...get().teamPoints, [m.teamId]: (get().teamPoints[m.teamId] ?? 0) + m.points },
        });
      },
      setInsights: (insights) => set({ insights }),
      resetDemo: () => set(seedState()),
    }),
    { name: 'taskforge:v1' },
  ),
);
