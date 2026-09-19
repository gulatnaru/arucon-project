import type { RecoveryPlan, ServerConfirmedCheckpoint, SyncAction } from './contracts';

/**
 * Applies the approved recovery boundary: restore only a server-confirmed
 * checkpoint and preserve unconfirmed local action identities without merging.
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
      kind: 'server_confirmed_only', reason: 'unconfirmed_local_actions_preserved',
      preservedActionIds, checkpoint, mergeLocalActions: false, emitRewardEvents: false,
    };
  }
  return { kind: 'ready', checkpoint, emitRewardEvents: false };
}
