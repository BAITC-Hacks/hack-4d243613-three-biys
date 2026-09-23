// k-anonymous weekly aggregation of activity events. Pure function. Owner: A.
// STUB (H1): returns empty aggregates with a valid PrivacyStats; real k=5 logic lands in H3.
import type { PrivacyStats, RawActivityEvent, TeamWeekAggregate } from '@/lib/types';

export function aggregateActivity(
  events: RawActivityEvent[],
  k = 5,
): { aggregates: TeamWeekAggregate[]; privacy: PrivacyStats } {
  return {
    aggregates: [],
    privacy: {
      rawEvents: events.length,
      individualsIdentified: 0,
      k,
      suppressedPatterns: 0,
      teamsReported: 0,
      teamsSuppressed: 0,
    },
  };
}
