'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
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

/**
 * First-visit consent window (terms + personal data). Rendered open from the very first (server) paint so the site can't
 * be used before consent; hidden only once localStorage shows the required consents. Never shown on /legal/* so the
 * documents linked from the window can be read before agreeing.
 */
export function ConsentMount() {
  const pathname = usePathname();
  const hydrated = useHydrated();
  const [saved, setSaved] = useState<Consents | null | undefined>(undefined);
  if (pathname?.startsWith('/legal')) return null;
  const current = hydrated ? (saved === undefined ? readConsent() : saved) : null;
  const accepted = !!current?.terms && !!current?.privacy;
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
