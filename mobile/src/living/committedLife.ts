import { APPROVED_GAME_CONFIG } from '../domain/config';
import type { PetState } from '../domain/model';

/** Safe foreground-only projection. Never mutates or replays absence settlement. */
export function committedToiletScene(before: PetState, after: PetState): string | null {
  if (before.petId !== after.petId || after.revision <= before.revision || before.hibernating || after.hibernating ||
      before.sleeping || after.sleeping || !after.toiletInstalled) return null;
  const elapsed = after.lastSimulatedAtMs - before.lastSimulatedAtMs;
  const timeEvent = elapsed > 0 && elapsed <= 60_000 && before.poopElapsedMs + elapsed >= APPROVED_GAME_CONFIG.proposal.poopIntervalMs;
  const foodEvent = after.totalExpUnits > before.totalExpUnits && after.foodsSincePoop < before.foodsSincePoop;
  return timeEvent || foodEvent ? `toilet:${after.petId}:${after.revision}` : null;
}
