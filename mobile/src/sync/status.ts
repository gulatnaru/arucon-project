import type { RecoveryPlan, SyncStatus, SyncSummary } from './contracts';
import type { WriterAccess } from './deviceAuthority';

export type SyncStatusExplanation =
  | 'last_sync_never_confirmed'
  | 'last_sync_confirmed'
  | 'local_changes_waiting'
  | 'local_changes_retrying'
  | 'conflict_preserved_not_merged'
  | 'read_only_fenced_device';

export type SyncStatusViewModel = Readonly<{
  status: SyncStatus;
  writerAccess: WriterAccess;
  pendingCount: number;
  errorCount: number;
  conflictCount: number;
  lastServerConfirmedAtMs: number | null;
  explanation: SyncStatusExplanation;
}>;

export type RecoveryStatusViewModel = Readonly<{
  status: 'server_confirmed_ready' | 'server_confirmed_with_preserved_conflicts';
  restoredThroughMs: number;
  preservedConflictCount: number;
  mergeApplied: false;
  rewardEventsEmitted: false;
  explanation: 'restored_server_confirmed_state' | 'restored_server_confirmed_state_local_changes_preserved';
}>;

/** Presentation data only; it cannot mutate or acknowledge the durable queue. */
export function buildSyncStatusViewModel(summary: SyncSummary, writerAccess: WriterAccess): SyncStatusViewModel {
  const explanation: SyncStatusExplanation = summary.status === 'conflict' ? 'conflict_preserved_not_merged' :
    writerAccess === 'read_only_fenced' ? 'read_only_fenced_device' :
    summary.status === 'error' ? 'local_changes_retrying' :
    summary.status === 'pending' ? 'local_changes_waiting' :
    summary.lastAcknowledgedAtMs === null ? 'last_sync_never_confirmed' : 'last_sync_confirmed';
  return {
    status: summary.status,
    writerAccess,
    pendingCount: summary.pendingCount,
    errorCount: summary.errorCount,
    conflictCount: summary.conflictCount,
    lastServerConfirmedAtMs: summary.lastAcknowledgedAtMs,
    explanation,
  };
}

export function buildRecoveryStatusViewModel(plan: RecoveryPlan): RecoveryStatusViewModel {
  return plan.kind === 'ready' ? {
    status: 'server_confirmed_ready',
    restoredThroughMs: plan.checkpoint.confirmedAtMs,
    preservedConflictCount: 0,
    mergeApplied: false,
    rewardEventsEmitted: false,
    explanation: 'restored_server_confirmed_state',
  } : {
    status: 'server_confirmed_with_preserved_conflicts',
    restoredThroughMs: plan.checkpoint.confirmedAtMs,
    preservedConflictCount: plan.preservedActionIds.length,
    mergeApplied: false,
    rewardEventsEmitted: false,
    explanation: 'restored_server_confirmed_state_local_changes_preserved',
  };
}
