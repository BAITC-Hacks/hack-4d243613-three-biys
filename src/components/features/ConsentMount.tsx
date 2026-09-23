'use client';

import { useState } from 'react';
import { ConsentGate, type Consents } from '@/components/domain';
import { useHydrated } from './useHydrated';

const KEY = 'kopir:consent:v1';

function readConsent(): Consents | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Consents) : null;
  } catch {
    return null;
  }
}

/** First-visit consent window (terms + personal data). Shown until the required consents are saved. */
export function ConsentMount() {
  const hydrated = useHydrated();
  return hydrated ? <Gate /> : null;
}

function Gate() {
  const [saved, setSaved] = useState(readConsent);
  const accepted = !!saved?.terms && !!saved?.privacy;
  return (
    <ConsentGate
      open={!accepted}
      onAccept={(c) => {
        try {
          localStorage.setItem(KEY, JSON.stringify(c));
        } catch {
          // Storage blocked: keep consent for this session only.
        }
        setSaved(c);
      }}
    />
  );
}
