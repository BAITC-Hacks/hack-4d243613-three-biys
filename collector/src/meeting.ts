// Meeting notes: the renderer records system audio (loopback) + mic as 30 s webm chunks and hands them to the main
// process over IPC; main uploads each chunk to /api/ingest/meeting-audio and finishes with /api/ingest/meeting-end.
// Audio never stays on disk; only the transcript comes back.
import { randomUUID } from 'node:crypto';

export interface MeetingConfig { serverUrl: string; ingestToken: string; team: string }
export interface MeetingStats { recording: boolean; meetingId?: string; title?: string; chunksSent: number; transcriptLength: number; lastError?: string }
export interface TranscriptEvent { meetingId: string; seq: number; text: string }

export class MeetingUploader {
  stats: MeetingStats = { recording: false, chunksSent: 0, transcriptLength: 0 };
  private seq = 0;
  private startedAt = '';

  constructor(private config: MeetingConfig, private onChange: (s: MeetingStats) => void, private onTranscript: (t: TranscriptEvent) => void) {}

  updateConfig(c: MeetingConfig) { this.config = c; }

  start(title: string) {
    this.stats = { recording: true, meetingId: `live-${randomUUID().slice(0, 8)}`, title: title || 'Meeting', chunksSent: 0, transcriptLength: 0 };
    this.seq = 0;
    this.startedAt = new Date().toISOString();
    this.onChange({ ...this.stats });
    return this.stats.meetingId!;
  }

  private url(p: string) { return `${this.config.serverUrl.replace(/\/$/, '')}${p}`; }

  async pushChunk(bytes: ArrayBuffer | Uint8Array, mime = 'audio/webm'): Promise<void> {
    if (!this.stats.recording || !this.stats.meetingId) return;
    const seq = this.seq++;
    const form = new FormData();
    form.set('audio', new Blob([bytes as BlobPart], { type: mime }), `${this.stats.meetingId}-${seq}.webm`);
    form.set('meetingId', this.stats.meetingId);
    form.set('title', this.stats.title ?? 'Meeting');
    form.set('team', this.config.team);
    form.set('seq', String(seq));
    form.set('startedAt', this.startedAt);
    try {
      const res = await fetch(this.url('/api/ingest/meeting-audio'), { method: 'POST', headers: { authorization: `Bearer ${this.config.ingestToken}` }, body: form });
      const json = (await res.json()) as { ok: boolean; data?: { text: string; transcriptLength: number }; error?: { message: string } };
      if (!json.ok) throw new Error(json.error?.message ?? `HTTP ${res.status}`);
      this.stats.chunksSent++;
      this.stats.transcriptLength = json.data?.transcriptLength ?? this.stats.transcriptLength;
      this.stats.lastError = undefined;
      if (json.data?.text) this.onTranscript({ meetingId: this.stats.meetingId, seq, text: json.data.text });
    } catch (e) {
      this.stats.lastError = (e as Error).message;
    }
    this.onChange({ ...this.stats });
  }

  async stop(): Promise<void> {
    if (!this.stats.recording || !this.stats.meetingId) return;
    const meetingId = this.stats.meetingId;
    try {
      const res = await fetch(this.url('/api/ingest/meeting-end'), {
        method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${this.config.ingestToken}` },
        body: JSON.stringify({ meetingId }),
      });
      const json = (await res.json()) as { ok: boolean; error?: { message: string } };
      if (!json.ok) throw new Error(json.error?.message ?? `HTTP ${res.status}`);
    } catch (e) {
      this.stats.lastError = (e as Error).message;
    }
    this.stats.recording = false;
    this.onChange({ ...this.stats });
  }
}
