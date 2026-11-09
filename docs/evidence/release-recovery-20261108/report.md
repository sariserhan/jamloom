# Release recovery — November 8, 2026

**PASS recovered evidence, local resilience changes and current shutdown checks; PARTIAL release.** The approved November 2 continuation already ran. Its permit is now correctly marked **CONSUMED**, not pending approval. No new paid execution, deployment, Git push, customer charge or Apple submission occurred in this recovery.

## Recovered execution

The saved [HTTP result](../readiness-recovery-20261102/style-http-result.json), [controller result](../readiness-recovery-20261102/style-control-result.json) and [independent cleanup](../readiness-recovery-20261102/style-cleanup.json) show:

- **PASS Music DNA:** one 107-second song delivered after 194.919 seconds of provider execution. WAV integrity and private delivery passed. The uncertain genre score was delivered with the approved style note. Twenty synthetic test credits were captured. The retained local audio still matches its [receipt hash and length](audio-integrity.json); this is not a new owner listening judgment.
- **FAIL Improvise:** one submission failed after 94.350 seconds of provider execution. Its ten test credits were returned. The retained provider receipt has no recognized failure diagnostic; this is not evidence of a model timeout or a musical-quality failure.
- **PASS cleanup:** endpoint limits 0/0, empty independent inventory and health, no pending jobs or held test credits, four remote test objects absent, original hardware restored, guardian stopped with no permit, and the held website restored. Historical receipts retain their original November 2 timestamps.

The [guardian log](../readiness-recovery-20261102/guardian-events.log) records a monitoring error, then an unconfirmed emergency shutdown, while Improvise was running. Subsequent reconciliation observed disabled capacity and stored `activation-unconfirmed`. This supports shutdown overlapping the failed request; it does **not** establish the original monitoring error or prove the worker's internal failure cause. The old catch blocks discarded that detail. No speculative model or timeout change was made.

## Current verification and billing

The November 8 local-date [read-only refresh](readonly.json) confirms zero workers/jobs, a stopped cycle, an inactive guardian with no permit, held generation on both public routes, ten available synthetic credits and zero reserved credits. No live ledger entries exist for the test account, matching its original zero live balance. Apple still reports [build 39 VALID and selected in an unsubmitted manual-release draft](apple-readonly.json).

[Continuation billing](continuation-billing.json) now reports **$0.06394757** for one observed worker, with six observed startup identities still absent. The [initial attempt](initial-billing.json) still has two identities without attributable rows. Missing rows are not zero cost. The broader [endpoint-hour report](endpoint-billing.json) reports $0.41286046 since November 2, including other historical checks; it is neither a campaign-specific invoice nor per-song operating economics. Full costs and capacity reliability remain **PARTIAL**.

## Local change and validation

Commit `3849153a01bba5b751c66fb48df4195becd60016` allows one retry of a provider GET after a transport failure or HTTP 502/503/504. Both attempts share the original eight-second abort deadline. PATCH activation/shutdown calls never retry within that operation; expired deadlines, authentication/rate-limit errors and malformed responses still fail. Emergency shutdown, credit admission, heartbeat freshness, budgets and cycle expiry remain enforced.

Guardian failures now record the stage and an allowlisted provider operation/error kind/status or database/network code. Raw exception messages, URLs, SQL, credentials and response bodies are excluded. Exhausted reads still trigger the existing emergency shutdown. This improves transient-read recovery and future diagnosis; the exact historical failure is not reproduced or claimed fixed.

**PASS:** 213 site tests; 38 isolated provider/capacity/cloud-song checks (including the five provider checks also counted in the site suite); TypeScript; production build; client bundle audit; packaged guardian syntax; one-request harness TypeScript/Python syntax and both dry runs. Database tests used disposable local PostgreSQL and stopped it afterward. [Validation](validation.json), [guardian package identity](guardian-package.json). New hosted validation and deployment are **NOT RUN**; the deployed application/guardian remain the prior held revision.

## Concrete next step

The [new plan](hosted-plan.json) is **PREPARED, not approved**: an additional maximum **$0.75**, one L4 startup cycle, at most one private Improvise submission, no generation retries or Music DNA repeat. It uses the same approved question crop and the ten refunded synthetic credits, with no new credit grant. Maximum preparation is 20 minutes, active capacity 40 minutes, total deployment/execution window 60 minutes, plus 130 seconds for shutdown. It retains the original $1 as consumed reservations; aggregate authorized/reserved ceiling would become $1.75 only after approval.

The [archived one-use harness](qualification-harness/README.md) and source/package hashes are ready. After approval: create the fresh one-use permit and exact-source deployment snapshot, install/verify the new guardian while disabled, deploy the private diagnostic with its expiry guard, execute once, verify idle shutdown and independent cleanup, and restore the held website. Never reuse the consumed November 2 runtime permit or old claimed files.

This proposal excludes sales, Apple submission and ongoing capacity. A successful diagnostic would not by itself qualify ongoing economics or waive the remaining release gates. Owner-closed studies and deferred scoring/training remain closed/deferred.
