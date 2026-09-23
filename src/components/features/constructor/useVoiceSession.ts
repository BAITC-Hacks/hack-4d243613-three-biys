'use client';

import { useEffect, useRef, useState } from 'react';
import type { CardField } from '@/lib/types';
import { voiceAvailable } from '@/lib/api-client';
import { VoiceInterview, type VoiceQuestion, type VoiceStatus } from '@/lib/voice/interview';

/** A's Realtime voice interview as state for B's AiInterview pop-up. Only available when the server runs live. */
export function useVoiceSession(draftText: string, questions: VoiceQuestion[]) {
  const [available, setAvailable] = useState(false);
  const [status, setStatus] = useState<VoiceStatus>('idle');
  const [error, setError] = useState<string>();
  const [byField, setByField] = useState<Partial<Record<CardField, string>>>({});
  const vi = useRef<VoiceInterview | null>(null);

  useEffect(() => {
    let alive = true;
    voiceAvailable().then((ok) => { if (alive) setAvailable(ok); });
    return () => { alive = false; vi.current?.stop(); };
  }, []);

  const start = async () => {
    setError(undefined);
    vi.current?.stop();
    vi.current = new VoiceInterview({
      onAnswer: (field, answer) => setByField((m) => ({ ...m, [field]: answer })),
      onStatus: (s, d) => { setStatus(s); if (s === 'error') setError(d); },
    });
    try {
      await vi.current.start({ draftText, questions, language: 'en' });
    } catch {
      // status and error are already set by the client
    }
  };

  const stop = () => vi.current?.stop();

  return { available, status, error, byField, start, stop };
}
