import type { JournalEntry } from './devLifeService';

export type MealCue = { token: string; mode: 'direct' | 'auto' };
export type MealCuePolicy = { mode: MealCue['mode']; atMs?: number | null };

/** A presentation hint from already committed growth and a matching meal event. */
export function confirmedMealCue(
  beforeExpUnits: number, afterExpUnits: number, journal: readonly JournalEntry[],
  policy: MealCuePolicy, petId: string,
): MealCue | null {
  if (afterExpUnits <= beforeExpUnits) return null;
  const entry = [...journal].reverse().find(item =>
    item.event.type === 'MealConsumed' && item.event.mode === policy.mode &&
    (policy.mode === 'direct' || (policy.atMs !== null && policy.atMs !== undefined &&
      item.commandId.startsWith(`auto:${petId}:${policy.atMs}:`))),
  );
  return entry ? { token: entry.id, mode: policy.mode } : null;
}
