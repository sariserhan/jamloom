# Bounded song preparation

Implementation commit: `1e811c05`. Status: **PASS local implementation; NOT RUN hosted lifecycle qualification.** This is an opt-in release candidate. An empty `JAMLOOM_CLOUD_CAPACITY_PERMIT` preserves existing behavior and cannot start a worker. No permit has been configured or funded by this change.

Signed-in customers with enough spendable credits can explicitly select **Prepare song creation** in Music DNA or Improvise on the web, mobile web and native iPhone app. Browsing, availability refresh and recovery never start a GPU. Preparation uploads no recording, creates no song and holds no customer credits. Generation still requires the normal price/consent confirmation. Preparation is operator-funded; it is not free infrastructure or proof that the credit catalog is profitable.

The server records an activation intent and reserves the entire cycle allowance before its one activation request. Concurrent customers share a cycle. A lost response causes shutdown, never another activation. At most one new cycle per account per 24 hours is allowed; accounts can share existing capacity. An operator permit limits aggregate cycle reservations across accounts and processes. Reservations are never refunded automatically, even when startup fails or ends early, because billing may arrive later.

## Configuration and independent shutdown

Apply reviewed migration `0034_cloud_capacity.sql` to the verified target after backup, before deploying this code. The migration has only been applied to disposable local databases in this increment.

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

This process cannot activate or renew capacity. It checks every ten seconds and publishes a heartbeat only after a successful check. Activation and song admission require a matching heartbeat less than 90 seconds old. The web's authenticated `/api/song-jobs` cron is a second shutdown path; it never publishes that heartbeat. Do not run the guardian on a sleeping laptop for production. Monitoring must alert on a missed heartbeat, failed shutdown, provider identity mismatch or remaining workers after expiry.

Preparation stops after 20 minutes without readiness. Ready capacity stops after two idle minutes; durable admitted jobs suppress idle shutdown. The finite cycle/permit deadline stops capacity even if busy. Shutdown records remain pending until provider health confirms all workers and jobs are absent. Restarted processes recover the same database cycle and never replay activation. Removing or invalidating the permit shuts down the recorded endpoint/image through cron, using the persisted configuration; retain database and provider credentials until cleanup completes. Graceful guardian termination also initiates shutdown. A hard guardian crash relies on the separate cron/supervisor; simultaneous provider/database/host outages remain an operational risk requiring monitored recovery.

## Release order

1. Push the reviewed commits when the owner is ready. Verify hosted CI, back up and apply migration 0034; verify all migration hashes.
2. Publish/verify an image containing any desired worker optimization separately. The current application pin remains unchanged; local ranking speedups are not hosted evidence.
3. Deploy the candidate with sales held and no demand permit. Install and verify the independently supervised watchdog and cron.
4. Prepare an exact, separately approved finite private qualification permit. Verify off → preparing → ready → delivery → idle/expiry → independently confirmed zero workers, including lost-response/crash recovery. Do not reuse a consumed diagnostic permit.
5. Reconcile attributable startup, idle, failed work, execution, storage and fees against the unchanged catalog. Keep cost qualification unset until the evidence passes. AI DJ capacity/economics is separate; do not reopen the owner-closed endurance study.
6. Build/upload a new iPhone candidate for the preparation controls, then finish the funded App Review flow and existing Stripe activation only after the release gates pass. Uploaded build 38 does not contain these new controls. Apple approval and public availability remain external steps.

For rollback, disable new generation and purchases first; retain the shutdown process, cron and provider/database credentials until the ledger and live provider both show no work. Existing results/downloads remain accessible. Removing the permit is not a substitute for verifying shutdown.

## Validation

`tests/cloud-capacity.test.ts` exercises real disposable PostgreSQL transactions, concurrent starts, immutable aggregate budgets, same-origin/auth/credit admission, lost activation responses, startup/idle/expiry shutdown, guardian failure and configuration removal. `tests/cloud-capacity-browser.mjs` renders explicit preparation and ambiguous-response recovery on desktop/mobile Chromium and WebKit. Native `AccountTests` covers both product preparation flows. These use provider fixtures and never rent a GPU.

Provider semantics were checked against the official [endpoint update API](https://docs.runpod.io/api-reference-v2/serverless/update-a-serverless-endpoint) and [worker configuration](https://docs.runpod.io/serverless/endpoints/endpoint-configurations). Context7 was unavailable. Active workers bill while idle, so the implementation always records and supervises a finite operator allowance before enabling them.
