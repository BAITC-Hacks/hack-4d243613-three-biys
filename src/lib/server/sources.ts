// Collector data collections on top of storage.ts + the merged seed/live SourcesSnapshot. Owner: A.
import { createHash } from 'node:crypto';
import type { ActivityEventInput, MeetingNote, RawActivityEvent, SourcesSnapshot } from '@/lib/types';
import { aggregateActivity } from '@/lib/discover/aggregate';
import { getJson, setJson } from './storage';
import seedMeetings from '@/data/seed/meetings.json';
import seedEvents from '@/data/seed/activity-events.json';

const MAX_LIVE_EVENTS = 50_000;

export interface MeetingInProgress { meetingId: string; title: string; team: string; startedAt: string; parts: Record<number, string> }
type Devices = Record<string, { team: string; lastSeenAt: string }>;

// Device IDs never reach storage as-is: they are hashed with the ingest token as salt and dropped by the aggregator.
export function pseudonymize(deviceId: string): string {
  return createHash('sha256').update(`${process.env.INGEST_TOKEN ?? 'local'}:${deviceId}`).digest('hex').slice(0, 16);
}

export async function appendEvents(deviceId: string, team: string, events: ActivityEventInput[]): Promise<number> {
  const user = pseudonymize(deviceId);
  const now = new Date().toISOString();
  const live = await getJson<RawActivityEvent[]>('events', []);
  const add: RawActivityEvent[] = events.map((e) => ({ ...e, user, team }));
  const next = [...live, ...add].slice(-MAX_LIVE_EVENTS);
  await setJson('events', next);
  const devices = await getJson<Devices>('devices', {});
  devices[user] = { team, lastSeenAt: now };
  await setJson('devices', devices);
  return add.length;
}

export async function appendMeetingChunk(meta: Omit<MeetingInProgress, 'parts'>, seq: number, text: string): Promise<MeetingInProgress> {
  const all = await getJson<Record<string, MeetingInProgress>>('meeting-chunks', {});
  const m = all[meta.meetingId] ?? { ...meta, parts: {} };
  m.parts[seq] = text;
  all[meta.meetingId] = m;
  await setJson('meeting-chunks', all);
  return m;
}

export async function finishMeeting(meetingId: string): Promise<MeetingNote> {
  const all = await getJson<Record<string, MeetingInProgress>>('meeting-chunks', {});
  const m = all[meetingId];
  const transcript = m ? Object.keys(m.parts).map(Number).sort((a, b) => a - b).map((k) => m.parts[k]).join(' ').trim() : '';
  const note: MeetingNote = {
    id: meetingId,
    date: (m?.startedAt ?? new Date().toISOString()).slice(0, 10),
    title: m?.title || 'Meeting',
    team: m?.team || 'unknown',
    transcript,
    origin: 'live',
  };
  const meetings = await getJson<MeetingNote[]>('meetings', []);
  await setJson('meetings', [...meetings.filter((x) => x.id !== meetingId), note]);
  if (m) { delete all[meetingId]; await setJson('meeting-chunks', all); }
  return note;
}

export async function getSnapshot(k = 5): Promise<SourcesSnapshot> {
  const [liveEvents, liveMeetings, devices] = await Promise.all([
    getJson<RawActivityEvent[]>('events', []),
    getJson<MeetingNote[]>('meetings', []),
    getJson<Devices>('devices', {}),
  ]);
  const events = [...(seedEvents as RawActivityEvent[]), ...liveEvents];
  const { aggregates, privacy } = aggregateActivity(events, k);
  const meetings = [...(seedMeetings as MeetingNote[]), ...liveMeetings].sort((a, b) => a.date.localeCompare(b.date));
  const lastEventAt = liveEvents.length ? liveEvents[liveEvents.length - 1].ts : undefined;
  const lastMeetingAt = liveMeetings.length ? liveMeetings[liveMeetings.length - 1].date : undefined;
  return { meetings, aggregates, privacy, chats: [], live: { devices: Object.keys(devices).length, lastEventAt, lastMeetingAt } };
}
