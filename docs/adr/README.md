# Arucon technical ADR index

This index records current provisional technical implementation documents. Product decisions remain in their documented OPEN or PROPOSED state; this index does not approve or change them.

The 2026-09-19 user delegation accepts reversible technical choices under AUTO_DECIDE. The ADRs below record those choices; their native execution limits and product activation gates remain explicit.

- [ADR-001 durable sync retry](ADR-001-sync-retry.md) — backoff/jitter, ordered dispatch, additive schema6, no action drop.
- [ADR-003 synthetic notification delivery](ADR-003-notification-delivery.md) — injected policy, idempotent port, cancellation/revocation, actual delivery disabled.
- [ADR-004 technical authority](ADR-004-technical-authority.md) — architecture/storage/test choices separated from product approvals.

- [APP-01 renderer](../../mobile/docs/APP-01-shell.md) — Expo + Three renderer experimental implementation; native runtime remains unverified.
- [APP-02 domain and storage](../../mobile/docs/APP-02-domain-storage.md) — SQLite local development contract; Node integration is validated, native SQLite runtime remains unverified.
- [Root repository layout](ADR-root-mobile-layout.md) — mobile is an ordinary root repository directory; no nested Git repository.
- [ADR-002 native integration](ADR-002-native-integration.md) — local Expo Module and CNG plugin, with health access and native widget targets default OFF.

Related product decisions DEC-12, DEC-17, and DEC-31 remain OPEN.
