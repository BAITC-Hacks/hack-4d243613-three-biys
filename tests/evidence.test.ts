import { describe, expect, it } from 'vitest';
import { verifyInsights } from '@/lib/ai/evidence';
import { aggregateActivity } from '@/lib/discover/aggregate';
import meetings from '@/data/seed/meetings.json';
import events from '@/data/seed/activity-events.json';
import type { Insight, MeetingNote, RawActivityEvent, SourcesSnapshot } from '@/lib/types';

const { aggregates, privacy } = aggregateActivity(events as RawActivityEvent[], 5);
const snap: SourcesSnapshot = { meetings: meetings as MeetingNote[], aggregates, privacy, chats: [], live: { devices: 0 } };

const base: Insight = {
  id: 'i', title: 'Orders re-typed', problem: 'p', affectedTeam: 'Sales', frequency: 0, impact: 'high', suggestedSolutionType: 'Integration',
  evidence: [], draftText: 'd', suggestedFields: {},
};

describe('evidence verification', () => {
  it('keeps verbatim quotes and real metrics, drops fabricated ones', () => {
    const r = verifyInsights([{
      ...base,
      evidence: [
        { sourceType: 'meeting', sourceId: 'mt-2026-09-08-sales', date: 'x', quote: 'We keep retyping orders from Excel into the CRM' },
        { sourceType: 'meeting', sourceId: 'mt-2026-09-08-sales', date: 'x', quote: 'We love retyping orders' },
        { sourceType: 'activity', sourceId: 'Sales:2026-W38', date: 'x', metric: '142 Spreadsheet→CRM transfers, 6 contributors' },
        { sourceType: 'activity', sourceId: 'Sales:2026-W38', date: 'x', metric: '999 transfers' },
        { sourceType: 'activity', sourceId: 'Finance:2026-W38', date: 'x', metric: '31 transfers' },
      ],
      suggestedFields: { data: 'Activity: 142 Spreadsheet→CRM transfers by 6 contributors', need: 'Build a rocket to Mars with lasers' },
    }], snap, []);
    expect(r.insights).toHaveLength(1);
    expect(r.dropped).toBe(3);
    expect(r.insights[0].evidence).toHaveLength(2);
    expect(r.insights[0].evidence[0].date).toBe('2026-09-08');
    expect(r.insights[0].frequency).toBe(142);
    expect(r.insights[0].suggestedFields.data).toBeDefined();
    expect(r.insights[0].suggestedFields.need).toBeUndefined();
  });
  it('drops an insight with no verifiable evidence', () => {
    const r = verifyInsights([{ ...base, evidence: [{ sourceType: 'meeting', sourceId: 'nope', date: 'x', quote: 'anything at all here' }] }], snap, []);
    expect(r.insights).toHaveLength(0);
    expect(r.dropped).toBe(1);
  });
});
