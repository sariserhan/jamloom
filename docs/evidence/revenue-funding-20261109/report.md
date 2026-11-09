# Revenue-funded capacity — November 9, 2026

Status: PASS implementation, production migration and public rollout. PARTIAL overall cash automation: provider recharge and actual Apple settlement ingestion remain separate.

- Owner approved 20% net proceeds, one L4 worker initially; no seed extension or card auto-pay.
- 39 isolated database/payment/capacity checks, 242 site checks, operating checks and typecheck passed. An initial test attempted a physical user deletion, correctly rejected by existing financial-retention foreign keys; the test now uses the production anonymization model.
- Migration 0035 applied after full private backup and successful local restore. All 35 migration hashes match; repeat apply is a no-op; song and credit-ledger counts unchanged.
- Live read before rollout: $11.384561 provider credit, zero active capacity cycles, zero live Stripe/Apple credit purchases. Revenue pool starts at zero.
- Pending versus settled, duplicate payment events, conflicting evidence, test exclusion, refund-before-payment, refund debt, concurrent preparation, provider-credit exhaustion, lost activation responses, seed expiry/exhaustion and stop-only recovery are tested against isolated PostgreSQL and fake provider transports. No paid GPU activation or real customer charge was used for validation.
- Exact policy and continuing limits: [GPU_REVENUE.md](../../GPU_REVENUE.md).

Source `39f567155235fe8cd59c2e84b20776df55b93714` is live at https://www.jamloom.com via `dpl_3N49tGWAE21Hi7WWEHruna7bAnXC`; promotion occurred after protected account, monitor and Checkout checks. The production policy setting is persisted for future builds. No Git push.

The independent guardian and five-minute monitor use the same source/policy. Protected and public monitor reads show no alerts, a fresh guardian, zero workers, $0 revenue funding, $11.384561 provider prepaid credit and thirteen complete $0.75 seed cycles ($9.75 usable out of the $10 cap). Revenue-backed operation has no calendar expiry. The seed dates/cap and worker image are unchanged.

Public authenticated account/catalog checks pass. Protected and public $20/150-credit Stripe Checkout sessions opened and were immediately expired unpaid. No charge, credit grant, worker activation, generation retry or new card funding occurred. Browser verification initially hit the existing five-sign-ins-per-minute protection after repeated validation logins; no rate limit was weakened.

Provider cash recharge, actual Apple proceeds and measured 65% economics remain separate; Creator renewal protection remains active. No actual live customer proceeds exist yet, so real settlement-to-GPU-spend has not been observed; its accounting/concurrency paths passed the isolated tests. No real customer charge was collected as a test.

Evidence: [migration](migration.json), [services](services.json), [deployment](deployment-receipt.json), [protected monitor](candidate-monitor.json), [public monitor](public-monitor.json), [public account](public-http.json), [unpaid public Checkout](public-checkout.json). Test logs: [database/capacity](capacity.log), [site](site.log), [operating/cost](operating.log), [types](types.log).

Final browser checks: **PASS** Chromium and WebKit at 1280px and 390px; live offer buttons enabled, unfunded trial disabled, renewal-pause disclosure visible, no page errors or horizontal overflow. The rate-limit window was allowed to reset. [Browser evidence](public-browser.json). Temporary account removed; both Checkout sessions expired unpaid. [Cleanup](check-cleanup.json). The task-created Git archive deployment copy was removed, recovering 341.9 MiB; original source and evidence remain. [Storage receipt](deployment-source-cleanup.json).
