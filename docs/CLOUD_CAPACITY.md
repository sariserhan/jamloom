**November 9 update:** Revenue-funded continuation is live. The owner-approved 20% of settled net web proceeds funds additional bounded cycles, retaining one L4 worker and independent stop-only supervision. The original seed dates/cap stay unchanged. [Current funding policy and limits](GPU_REVENUE.md) supersedes finite-only statements below for revenue-backed cycles.

# Bounded song preparation

**Current public phase — November 8:** The owner approved public web launch and a fresh **$10/seven-day** permit for customers and the two existing App Review accounts. Source `054b8a8c` is live with independent operating alerts and protected web renewals. The original unused review funding is retired, not added to the new allowance. One L4, thirteen $0.75 cycles maximum, automatic idle/expiry shutdown, no renewal. The matching guardian is active; workers are 0/0 and the new allowance is unused at handoff. Expiry is November 15 at 10:49:57 p.m. Eastern. New purchases fail closed if funding expires/exhausts or the guardian becomes stale. Cost qualification remains unverified under the explicit launch exception. iOS remains WAITING_FOR_REVIEW. [Evidence](evidence/public-launch-20261108/report.md). Earlier review-only checkpoints below are historical.

Implementation `1e811c05`; readiness repair `37a0d0be`; guardian resilience `3849153a`; single-product review recovery `9932696f`. **PASS ordinary lifecycle on private staging; PARTIAL operating/release qualification.** One private 44-second Improvise song delivered, credit/privacy checks and automatic idle shutdown passed, and independent cleanup confirms workers 0/0. The protected candidates and temporary database are retired; the updated guardian remains installed but inactive with its production configuration restored. The public alias is unchanged. The one-cycle/$0.75 permit is consumed. [Current evidence](evidence/final-preparation-20261108/report.md).

Signed-in customers with enough spendable credits can explicitly select **Prepare song creation** in Music DNA or Improvise on the web, mobile web and native iPhone app. Browsing, availability refresh and recovery never start a GPU. Preparation uploads no recording, creates no song and holds no customer credits. Generation still requires the normal price/consent confirmation. Preparation is operator-funded; it is not free infrastructure or proof that the credit catalog is profitable.

The server records an activation intent and reserves the entire cycle allowance before its one activation request. Concurrent customers share a cycle. A lost response causes shutdown, never another activation. Ordinary accounts may create at most one new cycle per 24 hours; accounts can share existing capacity. Server-authorized, unexpired review accounts may explicitly prepare another cycle, but each still consumes its full reservation under the same finite operator cap. Client request fields cannot grant this exception. An operator permit limits aggregate cycle reservations across accounts and processes. Reservations are never refunded automatically, even when startup fails or ends early, because billing may arrive later.

## Configuration and independent shutdown

Apply reviewed migration `0034_cloud_capacity.sql` to the verified target after backup, before deploying this code. This is complete on production: the backup was successfully restored to a disposable database, migration 0034 applied, all 34 hashes match and repeat apply is a no-op. [Receipt](evidence/release-execution-20261102/migration.json).

Select the reviewed `JAMLOOM_CLOUD_COST_PROFILE`, exact endpoint/image/hardware and the existing credentials. Diagnostic hardware remains private-only. A demand permit and a static `JAMLOOM_CLOUD_ACTIVE_LEASE_*` cannot coexist. The permit is JSON with exactly these fields:

| Field | Meaning |
|---|---|
| `id` | Unique immutable approval identifier, 8–80 safe characters |
| `startsAt`, `expiresAt` | UTC epoch milliseconds; at most seven days apart |
| `capMicros` | Total operator allowance in millionths of USD, at most $100 |
| `cycleMicros` | Full reservation for one capacity cycle, including shutdown allowance |
| `cycleSeconds` | 1,800–2,400 seconds, additionally long enough for preparation and the longest song |

Validation checks the selected profile's rate against the entire cycle plus 130 shutdown seconds and fixed allowance. The current L4 minimum is 1,860 seconds. These are software limits; provider outages can prevent timely shutdown, and actual billing must be reconciled. This does not increase the customer credit price, worker request deadline or qualify a new GPU.

On a separately supervised host with the same reviewed database/endpoint/permit, first run the read-only preview:

```sh
cd apps/site
npm run capacity:watchdog
```

After an explicit bounded compute permit and deployment authorization, set `JAMLOOM_WATCHDOG_TARGET` to the exact database `host[:port]/database`, then supervise:

```sh
npm run capacity:watchdog -- --apply --watch
```

This process cannot activate or renew capacity. It checks every ten seconds and publishes a heartbeat only after a successful check. Activation and song admission require a matching heartbeat less than 90 seconds old. The web's authenticated `/api/song-jobs` cron is a second shutdown path; it never publishes that heartbeat. Do not run the guardian on a sleeping laptop for production. The operating monitor covers missed heartbeat, failed shutdown, provider identity mismatch and remaining workers after expiry, plus low/expiring allowance and failed live jobs. It runs through authenticated web cron and an independent headless timer, uses the owner-approved private email setting, and cannot activate a GPU. [Implementation and delivery evidence](evidence/operations-20261108/report.md).

If ready capacity returns to initializing without admitted jobs, the cycle returns to preparation while preserving its original startup deadline. Preparation stops after 20 minutes without readiness. Ready capacity stops after two idle minutes; durable admitted jobs suppress idle shutdown. The finite cycle/permit deadline stops capacity even if busy. Shutdown records remain pending until provider health confirms all workers and jobs are absent. Restarted processes recover the same database cycle and never replay activation. Removing or invalidating the permit shuts down the recorded endpoint/image through cron, using the persisted configuration; retain database and provider credentials until cleanup completes. Graceful guardian termination also initiates shutdown. Database reconciliation failure also triggers an identity-checked disable-only emergency stop. A hard guardian crash relies on the separate cron/supervisor; simultaneous provider/database/host outages remain an operational risk requiring monitored recovery.

## Release order

**November 8 owner exception:** “Allow review-only update and bounded review funding.” The approved seven-day/$7.50 review phase may update `www.jamloom.com` for exactly two allowlisted accounts while commercial economics continues. This is necessary because native build 39 accepts only that origin. Public purchases/generation remain disabled; commercial deployment/release still comes last. [Approved scope](evidence/review-phase-20261108/approved-plan.json). This supersedes the former cost-before-private-review ordering below, not commercial qualification.

1. Preserve the owner's Git-push control and public-deployment-last instruction. Necessary production migration 0034, backup/hash checks and build-39 upload are complete. Private staging is authorized.
2. The private candidate and independent guardian have passed ordinary preparation → delivery → idle shutdown, with no monitored errors. GET recovery and lost-response/crash/configuration recovery have local test evidence; the successful ordinary run is not hosted fault injection.
3. Reconcile complete attributable startup, idle, failed work, execution, storage and operational costs against the unchanged catalog. Keep cost qualification unset until the evidence passes. AI DJ economics is separate; the owner-closed endurance study stays closed.
4. The separate seven-day/$7.50 review-capacity authorization is approved. Verify reviewer access for its finite period and finalize the existing Apple draft. It uses a new permit, never the consumed diagnostic.
5. Complete Apple submission/approval and qualified existing Stripe activation under the release authorization. Report Apple submission, approval and public availability separately. Build 39 is VALID and selected; release remains MANUAL.
6. Perform public deployment/release last, after applicable readiness/provider/economic gates pass. Never promote a temporary diagnostic with its synthetic database or expired permit.

For rollback, disable new generation and purchases first; retain the shutdown process, cron and provider/database credentials until the ledger and live provider both show no work. Existing results/downloads remain accessible. Removing the permit is not a substitute for verifying shutdown.

## Validation

`tests/cloud-capacity.test.ts` exercises real disposable PostgreSQL transactions, concurrent starts, immutable aggregate budgets, same-origin/auth/credit admission, lost activation responses, startup/idle/expiry shutdown, guardian failure and configuration removal. `tests/cloud-capacity-browser.mjs` renders explicit preparation and ambiguous-response recovery on desktop/mobile Chromium and WebKit. Native `AccountTests` covers both product preparation flows. These use provider fixtures and never rent a GPU.

Provider semantics were checked against the official [endpoint update API](https://docs.runpod.io/api-reference-v2/serverless/update-a-serverless-endpoint) and [worker configuration](https://docs.runpod.io/serverless/endpoints/endpoint-configurations). Context7 was unavailable. Active workers bill while idle, so the implementation always records and supervises a finite operator allowance before enabling them.
