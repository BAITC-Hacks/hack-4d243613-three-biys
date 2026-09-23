import { describe, expect, it } from 'vitest';
import { positionPreview, rateCard } from '@/lib/rating';
import type { CardFields, TaskCard } from '@/lib/types';

const empty: CardFields = {
  title: null, context: null, need: null, users: null, data: null,
  constraints: null, expectedResult: null, successCriteria: null, contact: null,
};

const full: CardFields = {
  title: 'Automate order transfer from Excel to CRM',
  context: 'Sales managers receive orders as Excel files from dealers and re-type them into the CRM by hand every day.',
  need: 'We need to automate the transfer so nobody re-types orders.',
  users: '6 sales managers who enter dealer orders every day',
  data: 'Sample Excel exports (anonymized) and CRM API docs',
  constraints: 'Deadline 6 weeks; CRM has a REST API; no access to production data',
  expectedResult: 'A script or service that imports orders from Excel into the CRM.',
  successCriteria: 'Manual entry time cut by 80%; zero duplicate orders.',
  contact: 'Head of sales, weekly 30-min call, questions via chat',
};

const allConfirmed = Object.fromEntries(Object.keys(full).map((k) => [k, true]));

let n = 0;
function card(fields: CardFields, confirmed: Record<string, boolean> = {}): TaskCard {
  return {
    id: `c${++n}`, businessName: 'b', industry: 'i', topic: 't', skillsNeeded: [], draftText: '',
    fields, confirmed, fieldSource: {}, techSpec: null, techSpecConfirmed: false, status: 'published',
    origin: { kind: 'manual' }, history: [], suggestions: {}, createdAt: '2026-09-01T00:00:00Z', updatedAt: '2026-09-01T00:00:00Z',
  };
}

describe('rateCard', () => {
  it('empty card = 0, draft level, actions for every component', () => {
    const r = rateCard({ fields: empty, confirmed: {} });
    expect(r.total).toBe(0);
    expect(r.level).toBe('draft');
    expect(r.nextActions.length).toBeGreaterThanOrEqual(7);
    expect(r.nextActions[0].gain).toBe(20);
  });

  it('filled but unconfirmed = 0', () => {
    const r = rateCard({ fields: full, confirmed: {} });
    expect(r.total).toBe(0);
    expect(r.nextActions.every((a) => a.text.startsWith('Confirm'))).toBe(true);
  });

  it('full confirmed card ≥ 90 and priority', () => {
    const r = rateCard({ fields: full, confirmed: allConfirmed });
    expect(r.total).toBeGreaterThanOrEqual(90);
    expect(r.level).toBe('priority');
    expect(r.components.map((c) => c.max).reduce((a, b) => a + b)).toBe(100);
  });

  it('non-measurable success criteria lose points and get a hint', () => {
    const r = rateCard({ fields: { ...full, successCriteria: 'The managers should be happier with the process.' }, confirmed: allConfirmed });
    const sc = r.components.find((c) => c.key === 'successCriteria')!;
    expect(sc.points).toBeLessThan(sc.max);
    expect(sc.hints[0].gain).toBe(8);
  });

  it('vague phrase is flagged', () => {
    const r = rateCard({ fields: { ...empty, need: 'We want to automate it ASAP' }, confirmed: {} });
    expect(r.vagueness.map((v) => v.phrase.toLowerCase())).toContain('asap');
  });
});

describe('positionPreview', () => {
  it('position improves after the top next action', () => {
    const published = [card(full, allConfirmed), card(full, allConfirmed)];
    const mine = card({ ...full, successCriteria: null }, { ...allConfirmed, successCriteria: false });
    const p = positionPreview(mine, published);
    expect(p.of).toBe(3);
    expect(p.position).toBe(3);
    expect(p.ifNext?.action.field).toBe('successCriteria');
    expect(p.ifNext!.position).toBeLessThan(p.position);
  });

  it('junk or placeholder text earns nothing even when confirmed', () => {
    const junk: CardFields = { ...empty, context: 'asdf asdf asdf asdf', need: 'N/A', data: '- - - - - - - - - - -', users: 'ok ok ok ok ok ok ok', contact: 'не указано' };
    const r = rateCard({ fields: junk, confirmed: allConfirmed });
    expect(r.total).toBe(0);
  });
});
