// Browser store — owner: C. Contract signatures (PLAN.md §5).
'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import type { CardField, CardFields, Insight, Milestone, Proposal, TaskCard, TeamProfile, TechSpec } from '@/lib/types';
import { seedCards, seedInsights, seedProposals, seedTeams } from '@/data/seed';
import { rateCard } from '@/lib/rating';

export type Role = 'business' | 'student';

export interface StoreState {
  role: Role;
  currentTeamId: string;
  cards: TaskCard[];
  teams: TeamProfile[];
  proposals: Proposal[];
  milestones: Milestone[];
  teamPoints: Record<string, number>;
  insights: Insight[];

  setRole: (role: Role) => void;
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

const now = () => new Date().toISOString();

// Snapshot for the score-history timeline.
function withHistory(card: TaskCard, note: string): TaskCard {
  const r = rateCard(card);
  return { ...card, history: [...card.history, { ts: now(), total: r.total, level: r.level, note }] };
}

function seedState() {
  return {
    role: 'business' as Role,
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
    (set, get) => {
      const patchCard = (id: string, fn: (c: TaskCard) => TaskCard) =>
        set({ cards: get().cards.map((c) => (c.id === id ? { ...fn(c), updatedAt: now() } : c)) });

      return {
        ...seedState(),
        setRole: (role) => set({ role }),
        setTeam: (currentTeamId) => set({ currentTeamId }),
        updateTeam: (id, patch) => set({ teams: get().teams.map((t) => (t.id === id ? { ...t, ...patch } : t)) }),
        createCard: (partial) => {
          const id = partial.id ?? nanoid(8);
          const card: TaskCard = {
            businessName: 'QazCargo', // HACK: no auth — single demo business
            industry: '', topic: '', skillsNeeded: [], draftText: '',
            confirmed: {}, fieldSource: {}, techSpec: null, techSpecConfirmed: false,
            status: 'draft', origin: { kind: 'manual' }, history: [], suggestions: {},
            ...partial,
            fields: { ...emptyFields, ...partial.fields },
            id, createdAt: now(), updatedAt: now(),
          };
          set({ cards: [withHistory(card, 'created'), ...get().cards] });
          return id;
        },
        // An edit un-confirms the changed field: points only for confirmed values.
        updateFields: (id, patch) => patchCard(id, (c) => {
          const confirmed = { ...c.confirmed };
          const fieldSource = { ...c.fieldSource };
          for (const k of Object.keys(patch) as CardField[]) {
            if (patch[k] === c.fields[k]) continue;
            confirmed[k] = false;
            fieldSource[k] = 'manual';
          }
          return { ...c, fields: { ...c.fields, ...patch }, confirmed, fieldSource };
        }),
        confirmField: (id, field, confirmed) => patchCard(id, (c) =>
          withHistory({ ...c, confirmed: { ...c.confirmed, [field]: confirmed } }, `${confirmed ? 'confirmed' : 'unconfirmed'} ${field}`)),
        acceptSuggestion: (id, field) => patchCard(id, (c) => {
          const s = c.suggestions[field];
          if (!s) return c;
          const { [field]: _dropped, ...rest } = c.suggestions;
          return {
            ...c,
            fields: { ...c.fields, [field]: s.text },
            fieldSource: { ...c.fieldSource, [field]: 'insight' },
            confirmed: { ...c.confirmed, [field]: false },
            suggestions: rest,
          };
        }),
        setTechSpec: (id, techSpec, skillsNeeded) => patchCard(id, (c) => ({ ...c, techSpec, skillsNeeded, techSpecConfirmed: false })),
        confirmTechSpec: (id) => patchCard(id, (c) => ({ ...c, techSpecConfirmed: true })),
        publish: (id) => patchCard(id, (c) => withHistory({ ...c, status: 'published', publishedAt: now() }, 'published')),
        submitProposal: (p) => {
          const id = nanoid(8);
          set({ proposals: [...get().proposals, { ...p, id, status: 'pending', createdAt: now() }] });
          return id;
        },
        decideProposal: (id, status, rejectReason) => set({
          proposals: get().proposals.map((p) => (p.id === id ? { ...p, status, rejectReason, decidedAt: now() } : p)),
        }),
        addMilestone: (m) => set({ milestones: [...get().milestones, { ...m, id: nanoid(8), confirmedByBusiness: false }] }),
        confirmMilestone: (id) => {
          const m = get().milestones.find((x) => x.id === id);
          if (!m || m.confirmedByBusiness) return;
          set({
            milestones: get().milestones.map((x) => (x.id === id ? { ...x, confirmedByBusiness: true, confirmedAt: now() } : x)),
            teamPoints: { ...get().teamPoints, [m.teamId]: (get().teamPoints[m.teamId] ?? 0) + m.points },
          });
        },
        setInsights: (insights) => set({ insights }),
        resetDemo: () => set(seedState()),
      };
    },
    { name: 'taskforge:v1' },
  ),
);
