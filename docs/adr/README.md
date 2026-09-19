# Arucon technical ADR index

This index records reversible technical choices and the six MVP defaults approved by the user after checkpoint 34ab069. The scope of approval is in SRS v1.9 §0-4/§9-4; external health, legal, account, payment and release gates remain explicit.

The 2026-09-19 user delegation accepts reversible technical choices under AUTO_DECIDE. The ADRs below record those choices; their native execution limits and product activation gates remain explicit.

- [ADR-001 durable sync retry](ADR-001-sync-retry.md) — backoff/jitter, ordered dispatch, additive schema6, no action drop.
- [ADR-003 synthetic notification delivery](ADR-003-notification-delivery.md) — injected policy, idempotent port, cancellation/revocation, actual delivery disabled.
- [ADR-004 technical authority](ADR-004-technical-authority.md) — architecture/storage/test choices separated from product approvals.

- [APP-01 renderer](../../mobile/docs/APP-01-shell.md) — Expo + Three renderer experimental implementation; native runtime remains unverified.
- [APP-02 domain and storage](../../mobile/docs/APP-02-domain-storage.md) — SQLite local development contract; Node integration is validated, native SQLite runtime remains unverified.
- [Root repository layout](ADR-root-mobile-layout.md) — mobile is an ordinary root repository directory; no nested Git repository.
- [ADR-002 native integration](ADR-002-native-integration.md) — local Expo Module and CNG plugin selection; superseded for widget target generation by ADR-007.
- [ADR-007 native build readiness](ADR-007-native-build-readiness.md) — generated development widget targets and local build-environment evidence, with health access OFF.

DEC-12/17 are approved only for local technical choices; final supported OS, legal retention, real services and release claims remain gated. DEC-31 release/environment scope remains OPEN.

- [ADR-005 approved game policy](ADR-005-approved-game-policy.md) — bonus-only sleep, care-table evolution, initial toilet and coin catalog.
- [ADR-006 single writer](ADR-006-single-writer-recovery.md) — durable local writer guard, explicit handoff and confirmed recovery limits.
