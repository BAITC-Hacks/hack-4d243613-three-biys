'use client';
// Voice interview on the AI-questions step: the agent asks the listed questions by voice, answers land in the textareas.
// Uses src/lib/voice/interview.ts (A). Hidden when the server runs in replay mode (no OpenAI key).
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui';
import { voiceAvailable } from '@/lib/api-client';
import { VoiceInterview, type VoiceQuestion, type VoiceStatus } from '@/lib/voice/interview';
import type { CardField } from '@/lib/types';

const LABEL: Record<VoiceStatus, string> = {
  idle: 'Not started', connecting: 'Connecting…', listening: 'Listening — speak, you can interrupt',
  speaking: 'Agent is speaking', error: 'Error', finished: 'Interview finished — review the answers below',
};

export function VoiceInterviewPanel({ draftText, questions, onAnswer }: {
  draftText: string;
  questions: VoiceQuestion[];
  onAnswer: (field: CardField, answer: string) => void;
}) {
  const [available, setAvailable] = useState(false);
  const [status, setStatus] = useState<VoiceStatus>('idle');
  const [detail, setDetail] = useState<string | undefined>();
  const [captions, setCaptions] = useState<{ who: 'you' | 'agent'; text: string }[]>([]);
  const ref = useRef<VoiceInterview | null>(null);

  useEffect(() => { void voiceAvailable().then(setAvailable); }, []);
  useEffect(() => () => ref.current?.stop(), []);

  if (!available) return null;

  const start = async () => {
    setCaptions([]);
    ref.current?.stop();
    ref.current = new VoiceInterview({
      onAnswer,
      onStatus: (s, d) => { setStatus(s); setDetail(d); },
      onTranscript: (who, text) => setCaptions((c) => [...c.slice(-7), { who, text }]),
    });
    try { await ref.current.start({ draftText, questions }); } catch { /* status already shows the error */ }
  };
  const stop = () => { ref.current?.stop(); setStatus('idle'); };
  const running = status === 'connecting' || status === 'listening' || status === 'speaking';

  return (
    <div className="rounded-control border-2 border-border p-3 text-sm space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">Answer by voice</span>
        <span className={`rounded-full px-2 py-0.5 text-xs ${status === 'listening' ? 'bg-accent-soft' : status === 'error' ? 'bg-red-100' : 'bg-surface-2'}`}>
          {LABEL[status]}
        </span>
        <span className="grow" />
        {!running
          ? <Button size="sm" onClick={start}>{status === 'finished' ? 'Interview again' : 'Interview me'}</Button>
          : <Button size="sm" variant="secondary" onClick={stop}>Stop</Button>}
      </div>
      {status === 'error' && detail && <p className="text-xs text-red-700">{detail}</p>}
      {captions.length > 0 && (
        <ul className="space-y-1 text-xs">
          {captions.map((c, i) => <li key={i}><b>{c.who === 'you' ? 'You' : 'Agent'}:</b> {c.text}</li>)}
        </ul>
      )}
      <p className="text-xs text-muted">The agent asks exactly these questions, one by one, and fills the answers. You can edit any answer before building the card.</p>
    </div>
  );
}
