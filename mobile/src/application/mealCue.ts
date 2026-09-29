import type { JournalEntry } from './devLifeService';

export type MealCue = { token: string; mode: 'direct' | 'auto' };
export type MealCuePolicy = { mode: MealCue['mode']; atMs?: number | null; sinceMs?: number };

/** A presentation hint from already committed growth and a matching meal event. */
export function confirmedMealCue(
  beforeExpUnits: number, afterExpUnits: number, journal: readonly JournalEntry[],
  policy: MealCuePolicy, petId: string,
): MealCue | null {
  if (afterExpUnits <= beforeExpUnits) return null;
  const entry = [...journal].reverse().find(item => {
    if (item.event.type !== 'MealConsumed' || item.event.mode !== policy.mode) return false;
    if (policy.mode === 'direct') return true;
    if (policy.atMs === null || policy.atMs === undefined) return false;
    const prefix = `auto:${petId}:`;
    if (!item.commandId.startsWith(prefix)) return false;
    const at = Number(item.commandId.slice(prefix.length).split(':')[0]);
    const since = policy.sinceMs ?? policy.atMs;
    return Number.isSafeInteger(at) && Number.isSafeInteger(since) && Number.isSafeInteger(policy.atMs) &&
      since >= 0 && since <= at && at <= policy.atMs;
  });
  return entry ? { token: entry.id, mode: policy.mode } : null;
}
