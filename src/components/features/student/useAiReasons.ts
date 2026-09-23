'use client';

import { useEffect, useState } from 'react';
import type { Match, TaskCard, TeamProfile } from '@/lib/types';
import { rateCard } from '@/lib/rating';
import { recommend } from '@/lib/api-client';

/** Optional AI wording for rule-based matches. Never adds or removes matches; on failure the rule reasons stay. */
export function useAiReasons(team: TeamProfile, matches: Match[], cards: TaskCard[]) {
  const [state, setState] = useState<{ key: string; reasons: Record<string, string> }>({ key: '', reasons: {} });
  const key = team.id + ':' + matches.map((m) => m.taskId).join(',');

  useEffect(() => {
    if (!matches.length) return;
    let cancelled = false;
    const tasks = matches.flatMap((m) => {
      const c = cards.find((x) => x.id === m.taskId);
      if (!c) return [];
      return [{
        id: c.id,
        title: c.fields.title ?? '',
        topic: c.topic,
        summary: c.techSpec?.summary ?? c.fields.need ?? c.draftText,
        level: rateCard(c).level,
      }];
    });
    recommend({ team, tasks }).then((res) => {
      if (!cancelled && res.ok) setState({ key, reasons: res.data.reasons });
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch only when the team or matched task set changes
  }, [key]);

  return state.key === key ? state.reasons : {};
}
