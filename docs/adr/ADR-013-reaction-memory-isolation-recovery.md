# ADR-013: Isolated bounded reaction memory and corrupt-row quarantine

- Status: Accepted for the FUN-00 local implementation
- Date: 2026-09-27
- Scope: presentation repetition memory only; no game-state or retention-policy change

## Context

Reaction selection needs a small recent history across restarts to reduce repeated scenes. It must not turn presentation history into another source of game truth, block the room forever after one malformed row, or modify the game snapshot, economy ledgers, sync outbox, and fixture growth state.

Returning an empty in-memory fallback without repairing known corrupt reaction rows would fail again on every restart. Deleting the database would discard evidence and risks crossing the game-storage boundary. Future schema versions must remain untouched because this runtime cannot safely interpret them.

## Decision

- Live reaction memory uses `arucon-reactions.db`, separate from the game database. Growth previews use `arucon-reactions-fixture-<fixtureId>.db`, a fixture namespace, and a `petId` scope.
- A pet/namespace keeps the newest 32 shown/completed/cancelled session rows. It stores reaction and semantic-family identities, timestamps, source, and settlement only. It stores no dialogue text, health input, economy state, relationship score, or raw user activity.
- A known schema-v1 validation failure atomically copies the selected pet/namespace raw reaction rows to `reaction_memory_quarantine`, deletes those invalid active reaction rows, and returns an empty valid snapshot. The next start reads the recovered empty scope and can record new reactions.
- Quarantine retains at most 32 raw rows for that pet/namespace. This is a bounded technical diagnosis buffer in the reaction-only database, not a product history or a new legal retention policy.
- A schema version newer than this runtime is rejected before recovery writes. Its active rows and quarantine remain unchanged.
- Recovery never opens or writes `pet_snapshot`, command/meal ledgers, local outbox, sync state, or the game database file.

## Alternatives

1. **Empty process-only fallback.** Rejected because the same corrupt rows break every restart.
2. **Delete and recreate the reaction database.** Rejected because it loses diagnosis evidence and broadens deletion beyond the failing scope.
3. **Quarantine the affected reaction scope and continue empty.** Selected because it preserves bounded raw evidence, restores presentation availability, and stays outside game truth.

## Verification

Node SQLite integration tests cover shown/completed/cancelled transitions, pet-scoped 32-row bounds, live/fixture isolation, idempotent migration, known-v1 quarantine, restart after recovery, future-version refusal without mutation, and absence of game snapshot tables. Native Expo SQLite execution remains part of the app runtime integration evidence.
