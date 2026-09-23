// Browser client for the voice interview: WebRTC to OpenAI Realtime using the ephemeral secret from /api/ai/voice-session.
// Owner: A. Usage (C): const vi = new VoiceInterview({ onAnswer, onStatus, onTranscript, onFinish }); await vi.start({ draftText, questions }); vi.stop();
'use client';
import type { CardField } from '@/lib/types';

export interface VoiceQuestion { id: string; field: CardField; question: string; why: string; gain: number }
export type VoiceStatus = 'idle' | 'connecting' | 'listening' | 'speaking' | 'error' | 'finished';

export interface VoiceInterviewHandlers {
  onAnswer: (field: CardField, answer: string) => void;      // called each time the agent submits a field
  onStatus?: (status: VoiceStatus, detail?: string) => void;
  onTranscript?: (who: 'you' | 'agent', text: string) => void; // live captions
  onFinish?: () => void;
}

interface RealtimeEvent { type: string; [k: string]: unknown }

export class VoiceInterview {
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private mic: MediaStream | null = null;
  private audio: HTMLAudioElement | null = null;
  private agentBuffer = '';
  private responseActive = false;
  private continueAfterResponse = false;
  private answered = new Set<CardField>();
  private questions: VoiceQuestion[] = [];
  status: VoiceStatus = 'idle';

  constructor(private h: VoiceInterviewHandlers) {}

  private setStatus(s: VoiceStatus, detail?: string) { this.status = s; this.h.onStatus?.(s, detail); }

  async start(input: { draftText: string; questions: VoiceQuestion[]; language?: 'ru' | 'en' }) {
    this.setStatus('connecting');
    this.questions = input.questions;
    this.answered.clear();
    try {
      const res = await fetch('/api/ai/voice-session', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input) });
      const json = (await res.json()) as { ok: boolean; data?: { clientSecret: string; model: string }; error?: { message: string } };
      if (!json.ok || !json.data) throw new Error(json.error?.message ?? 'no voice session');
      const { clientSecret, model } = json.data;

      this.mic = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.pc = new RTCPeerConnection();
      this.audio = document.createElement('audio');
      this.audio.autoplay = true;
      this.pc.ontrack = (e) => { if (this.audio) this.audio.srcObject = e.streams[0]; };
      for (const t of this.mic.getTracks()) this.pc.addTrack(t, this.mic);
      this.dc = this.pc.createDataChannel('oai-events');
      this.dc.onmessage = (e) => this.handle(JSON.parse(e.data) as RealtimeEvent);
      this.dc.onopen = () => {
        this.setStatus('listening');
        this.createResponse(); // agent greets and asks the first question
      };

      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);
      const sdpRes = await fetch(`https://api.openai.com/v1/realtime/calls?model=${encodeURIComponent(model)}`, {
        method: 'POST', headers: { authorization: `Bearer ${clientSecret}`, 'content-type': 'application/sdp' }, body: offer.sdp,
      });
      if (!sdpRes.ok) throw new Error(`Realtime SDP ${sdpRes.status}: ${(await sdpRes.text()).slice(0, 200)}`);
      await this.pc.setRemoteDescription({ type: 'answer', sdp: await sdpRes.text() });
    } catch (e) {
      this.setStatus('error', (e as Error).message);
      this.stop();
      throw e;
    }
  }

  private send(ev: RealtimeEvent) { if (this.dc?.readyState === 'open') this.dc.send(JSON.stringify(ev)); }

  // Only one response may be active at a time (server VAD also creates them), otherwise OpenAI errors and the agent repeats itself.
  private createResponse() {
    if (this.responseActive) { this.continueAfterResponse = true; return; }
    this.responseActive = true;
    this.send({ type: 'response.create' });
  }

  private handle(ev: RealtimeEvent) {
    switch (ev.type) {
      case 'input_audio_buffer.speech_started': this.setStatus('listening'); break;
      case 'response.created': this.agentBuffer = ''; this.responseActive = true; break;
      case 'response.output_audio.delta': if (this.status !== 'speaking') this.setStatus('speaking'); break;
      case 'response.output_audio_transcript.delta': this.agentBuffer += String(ev.delta ?? ''); break;
      case 'response.output_audio_transcript.done': this.h.onTranscript?.('agent', String(ev.transcript ?? this.agentBuffer)); break;
      case 'conversation.item.input_audio_transcription.completed': this.h.onTranscript?.('you', String(ev.transcript ?? '')); break;
      case 'response.done':
        this.responseActive = false;
        if (this.status === 'speaking') this.setStatus('listening');
        if (this.continueAfterResponse) { this.continueAfterResponse = false; this.createResponse(); }
        break;
      case 'response.function_call_arguments.done': this.onTool(String(ev.name), String(ev.call_id), String(ev.arguments ?? '{}')); break;
      case 'error': this.setStatus('error', JSON.stringify((ev as { error?: unknown }).error ?? ev)); break;
    }
  }

  private onTool(name: string, callId: string, args: string) {
    let parsed: { field?: CardField; answer?: string } = {};
    try { parsed = JSON.parse(args); } catch { /* ignore */ }
    if (name === 'submit_answer' && parsed.field) { this.answered.add(parsed.field); this.h.onAnswer(parsed.field, (parsed.answer ?? '').trim()); }
    this.send({ type: 'conversation.item.create', item: { type: 'function_call_output', call_id: callId, output: JSON.stringify({ ok: true }) } });
    if (name === 'finish_interview') {
      // Every listed field gets an answer (empty = skipped) so the form is fully filled without manual work.
      for (const q of this.questions) if (!this.answered.has(q.field)) { this.answered.add(q.field); this.h.onAnswer(q.field, ''); }
      this.setStatus('finished');
      this.h.onFinish?.();
      setTimeout(() => this.stop(), 5000); // let the closing sentence play out
      return;
    }
    this.continueAfterResponse = true; // continue once the current response (the one that made the tool call) is done
  }

  stop() {
    this.dc?.close(); this.pc?.close();
    this.mic?.getTracks().forEach((t) => t.stop());
    this.dc = null; this.pc = null; this.mic = null;
    if (this.audio) { this.audio.srcObject = null; this.audio = null; }
    if (this.status !== 'finished' && this.status !== 'error') this.setStatus('idle');
  }
}
