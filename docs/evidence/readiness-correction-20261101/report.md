# Corrected readiness continuation — prepared, not approved

**PASS local preparation; NOT RUN hosted.** Application commit `2465f108` corrects the active-worker admission predicate. The observed `running=1, ready=0` state now passes admission; cached-only, occupied, initializing, throttled, unhealthy and invalid receipts remain closed. It does not claim a hot handler, successful song or viable cost from a health counter.

The prior A5000 attempt is stopped and independently cleaned up, with zero generation submissions and unchanged balances. Its no-retry/stop-on-failure permit cannot be silently resumed. [Completed attempt](../one-run-release-20261101/execution.md).

## Proposed continuation of the original aggregate budget

[Exact plan](hosted-plan.json): fresh 40-minute window including deployment and preparation, at most 130 seconds shutdown, one A5000, one private Music DNA request then only on success one Improvise request, no retries, stop on failure, independent cleanup and held-site restoration. Only the previously approved 1.22-second crop may be uploaded. No worker image publication, customer activation, ongoing review funding, Apple submission or AI DJ rental.

No additional aggregate budget is requested: preserve the original **$3 total**. Reserve **$1** for the stopped attempt (its entire original 40-minute plus shutdown envelope at the conservative 220-microdollar per second rate, plus $0.02 fixed allowance, is $0.5766). The new lease is capped at **$2**. Billing is still provisional; this conservative reserve is not a claim of actual cost. The original deadline would be explicitly replaced only after continuation approval.

The controller binds the corrected readiness source and prior zero-submission/cleanup receipt, enforces the $2 lease and original $3 aggregate allocation, and reserves at least 16 minutes after preparation. It never submits a warmup generation or repeats a song request. The normal app/account/upload/quote/submit/poll/download/ledger/privacy checks remain.

**PASS:** 206 site tests, 11 focused checks, 20 disposable-Postgres checks, site typecheck, both no-operation dry runs and harness typecheck. The regression fails before repair and passes afterward. The source is committed; no new lease, deployment, worker activation, credit hold or generation has started for this plan.
