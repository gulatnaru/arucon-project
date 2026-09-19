# ADR-006: Single writer, explicit handoff, and server-confirmed recovery

- Status: Accepted for the approved MVP product default
- Date: 2026-09-19
- Scope: synthetic/local implementation contract; no production account or server

## Context

The approved MVP allows one writing mobile device per account. A normal transfer must confirm the old device's durable queue before activating the new device. Forced recovery restores only a server-confirmed checkpoint. Work created offline by a fenced old device is preserved as conflict evidence and is not merged automatically. The UI must show durable sync state and the last server-confirmed time without implying that unconfirmed work was restored.

The local outbox uses one SQLite `AUTOINCREMENT` sequence across pets and writer epochs. A server contract that demands contiguous numbers per pet would falsely reject valid gaps.

## Alternatives

1. **Local UI flag only.** Simple, but a hidden or stale client could still write to transport and restart could lose the warning. Rejected.
2. **Synthetic authority plus durable local registration.** Selected. The service fake owns the active epoch and fences transport; SQLite stores what the installation last learned for restart guards and status. Server authority and local knowledge remain separate.
3. **Treat the local registration as server authority.** Rejected because a local database cannot establish account-wide writer ownership and an offline old device cannot receive an immediate remote fence.

## Decision

- `SyntheticSingleWriterAuthority` owns one active `WriterIdentity` for the synthetic account/pet fixture. Normal handoff accepts only in-process `pet_access` grants with exact account, pet, and device scope.
- Normal handoff requires `pending=error=conflict=0` and an exact match between the local last acknowledgement and the synthetic service receipt. A stable `handoffId` makes exact replay idempotent; reuse with another target or payload fails.
- Activation atomically advances the epoch by one and changes the active device. The previous epoch is fenced at transport. Known-fenced installations persist `read_only_fenced` and block mutation through `LocalWriteAuthorityGuard`.
- An old installation that was offline during handoff may still create local work because it did not receive the fence. On reconnection, the service rejects its old epoch, the outbox records a durable conflict, and no command or reward is re-executed.
- Forced recovery issues a new epoch and returns only the configured server-confirmed checkpoint. Unconfirmed action IDs remain durable conflicts with `mergeLocalActions=false` and `emitRewardEvents=false`.
- SQLite schema v7 adds `local_sync_registration` and `local_sync_checkpoint`. Registration records account/pet/device scope, epoch, `active_writer` or `read_only_fenced`, authority event ID, and update time. The checkpoint row records the exact recovery event, server-confirmed state metadata, and preserved conflict IDs. Both are local restart knowledge, not proof of production server authority.
- Initial pet creation and its first registration can commit in one transaction. Existing DEV snapshots are registered without changing their coin, food, EXP, form, facilities, or other state.
- Transport sequence validation is monotonic for the writer epoch: duplicate and reverse values fail while gaps from the global SQLite sequence are accepted. Queue head-of-line blocking, `actionId` idempotency, and acknowledgement checks still prevent a failed earlier action from being bypassed within its local stream.
- The local fake resolves each outbox action to that action's committed ledger snapshot before delivery. Its allowlisted projection uses the historical form/revision/display state, and a successful acknowledgement advances the fake's recovery checkpoint with the same snapshot and cumulative action IDs. Later unconfirmed local state cannot leak into or be mistaken for a confirmed checkpoint.
- The application-facing surface is `SyncApplicationService`, `DurableSyncStatusReader`, `LocalWriteAuthorityGuard`, and `createLocalSyntheticSyncController`. Status exposes counts, writer access, last confirmed time, and stable explanation tokens. Explicit retry calls the existing durable coordinator. The controller composes issued DEV grants, the privacy projection, queue, coordinator, and fake authority only for the first explicit local fixture. If durable registration already exists after restart, it refuses to recreate an authority and leaves flush/handoff unavailable.

## Boundaries

- The authority is an in-process fake. Recreating it does not prove server restart recovery, account-wide locking, token security, or network behavior.
- The local controller deliberately does not recreate this fake from SQLite after restart. It displays durable status and preserves active/fenced knowledge, while stating that in-process authority is unavailable.
- A persisted fence survives app restart. A device that never received the fence cannot be claimed to stop immediately; transport fencing is the authoritative boundary when it reconnects.
- Actual account creation, authentication service, legal consent, raw health access, cloud project, production checkpoint storage, and network transport remain disabled.
- Recovery never deletes local conflict evidence, auto-merges economic state, recomputes past rewards, or presents unconfirmed work as synced.

## Verification

The focused suite covers pending-source rejection, normal transfer, exact replay, handoff ID misuse, restart fence persistence, commit guard, old-device conflict, forced recovery, last-sync status, account/pet/device/consent failures, monotonic gaps, migration rollback, and unchanged snapshots. Raw/secret outbound allowlist tests remain part of the impact suite.
