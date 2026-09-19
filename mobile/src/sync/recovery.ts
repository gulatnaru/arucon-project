import type { RecoveryPlan, ServerConfirmedCheckpoint, SyncAction } from './contracts';

/**
 * Plans recovery without inventing DEC-10 conflict behavior. Unconfirmed local
 * actions are preserved and require a product decision instead of auto-merging.
 */
export function planServerConfirmedRecovery(
  checkpoint: ServerConfirmedCheckpoint,
  unconfirmedLocalActions: readonly Pick<SyncAction, 'actionId'>[],
): RecoveryPlan {
  if (!checkpoint.petId || checkpoint.state.petId !== checkpoint.petId) throw new Error('Recovery checkpoint pet mismatch');
  if (!Number.isSafeInteger(checkpoint.confirmedAtMs) || checkpoint.confirmedAtMs < 0 ||
      !Number.isSafeInteger(checkpoint.serverRevision) || checkpoint.serverRevision < 0 || !checkpoint.configVersion) {
    throw new Error('Invalid recovery checkpoint metadata');
  }
  const preservedActionIds = [...new Set(unconfirmedLocalActions.map(action => action.actionId))].sort();
  if (preservedActionIds.length > 0) {
    return {
      kind: 'decision_required', decision: 'DEC-10', reason: 'unconfirmed_local_actions',
      preservedActionIds, checkpoint,
    };
  }
  return { kind: 'ready', checkpoint, emitRewardEvents: false };
}
