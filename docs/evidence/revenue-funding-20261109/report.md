# Revenue-funded capacity — November 9, 2026

Status: PASS local implementation and production migration; hosted rollout in progress.

- Owner approved 20% net proceeds, one L4 worker initially; no seed extension or card auto-pay.
- 39 isolated database/payment/capacity checks, 242 site checks, operating checks and typecheck passed. An initial test attempted a physical user deletion, correctly rejected by existing financial-retention foreign keys; the test now uses the production anonymization model.
- Migration 0035 applied after full private backup and successful local restore. All 35 migration hashes match; repeat apply is a no-op; song and credit-ledger counts unchanged.
- Live read before rollout: $11.384561 provider credit, zero active capacity cycles, zero live Stripe/Apple credit purchases. Revenue pool starts at zero.
- Pending versus settled, duplicate payment events, conflicting evidence, test exclusion, refund-before-payment, refund debt, concurrent preparation, provider-credit exhaustion, lost activation responses, seed expiry/exhaustion and stop-only recovery are tested against isolated PostgreSQL and fake provider transports. No paid GPU activation or real customer charge was used for validation.
- Exact policy and continuing limits: [GPU_REVENUE.md](../../GPU_REVENUE.md).

Hosted/public checks are pending. Provider cash recharge, actual Apple proceeds and measured 65% economics remain separate; Creator renewal protection remains active.
