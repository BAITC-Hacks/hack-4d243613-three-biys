'use client';

import { useEffect, useRef, useState } from 'react';
import type { CardField } from '@/lib/types';
import { voiceAvailable } from '@/lib/api-client';
import { VoiceInterview, type VoiceQuestion, type VoiceStatus } from '@/lib/voice/interview';
import { Button } from '@/components/ui';

const STATUS_TEXT: Record<VoiceStatus, string> = {
  idle: 'Ready',
  connecting: 'Connecting…',
  listening: 'Listening — speak your answer',
  speaking: 'Interviewer is speaking',
  error: 'Voice interview failed',
  finished: 'Interview finished — review the answers below',
};

/** Optional voice mode for the clarify step. Answers land in the same text fields, so the business still reviews them. */
export function VoiceAnswers({ draftText, questions, onAnswer }: {
  draftText: string;
  questions: VoiceQuestion[];
  onAnswer: (field: CardField, answer: string) => void;
}) {
  const [available, setAvailable] = useState(false);
  const [status, setStatus] = useState<VoiceStatus>('idle');
  const [detail, setDetail] = useState<string>();
  const [captions, setCaptions] = useState<{ who: 'you' | 'agent'; text: string }[]>([]);
  const vi = useRef<VoiceInterview | null>(null);
  const answerRef = useRef(onAnswer);

  useEffect(() => {
    answerRef.current = onAnswer;
  });

  useEffect(() => {
    let alive = true;
    voiceAvailable().then((ok) => { if (alive) setAvailable(ok); });
    return () => { alive = false; vi.current?.stop(); };
  }, []);

  if (!available) return null;

  const running = status === 'connecting' || status === 'listening' || status === 'speaking';

  const start = async () => {
    setCaptions([]);
    setDetail(undefined);
    vi.current = new VoiceInterview({
      onAnswer: (field, answer) => answerRef.current(field, answer),
      onStatus: (s, d) => { setStatus(s); setDetail(d); },
      onTranscript: (who, text) => setCaptions((c) => [...c.slice(-5), { who, text }]),
    });
    try {
      await vi.current.start({ draftText, questions, language: 'en' });
    } catch {
      // status 'error' is already set by the client
    }
  };

  return (
    <section className="space-y-2 rounded-control border-2 border-border bg-surface p-4">
      <div className="flex flex-wrap items-center gap-3">
        {running ? (
          <Button variant="secondary" onClick={() => vi.current?.stop()}>Stop voice interview</Button>
        ) : (
          <Button variant="secondary" onClick={start}>Answer by voice</Button>
        )}
        <span className="text-sm text-muted">
          {STATUS_TEXT[status]}{status === 'error' && detail ? `: ${detail}` : ''}
        </span>
      </div>
      {captions.length > 0 && (
        <ul className="space-y-1 text-sm">
          {captions.map((c, i) => (
            <li key={i}><b>{c.who === 'you' ? 'You' : 'Interviewer'}:</b> {c.text}</li>
          ))}
        </ul>
      )}
      <p className="text-xs text-muted">Uses your microphone. Answers are written into the fields below — edit them before building the card.</p>
    </section>
  );
}
