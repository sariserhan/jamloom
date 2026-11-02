# Corrected readiness continuation — result

**FAIL capacity; PASS local repair, deployment/preflight and independent cleanup.** The approved continuation reached its preparation cutoff without any worker allocation. No song was submitted; all balances remain unchanged and the held website is restored. This permit is consumed, with no retry. [Execution](execution.md) and [aggregate record](aggregate-result.json).

Application source `2465f108` corrects the running-plus-cached-ready bug. Its local regression, 206 site tests, 20 disposable-database checks and typecheck pass. During the continuation, provider capacity remained absent, so this run does not establish successful delivery or complete operating economics. Sales and Apple submission remain closed.

The prior A5000 attempt is stopped and independently cleaned up, with zero generation submissions and unchanged balances. Its no-retry/stop-on-failure permit cannot be silently resumed. [Completed attempt](../one-run-release-20261101/execution.md).

## Approved bounds and historical preparation

[Exact plan](hosted-plan.json): fresh 40-minute window including deployment and preparation, at most 130 seconds shutdown, one A5000, one private Music DNA request then only on success one Improvise request, no retries, stop on failure, independent cleanup and held-site restoration. Only the previously approved 1.22-second crop may be uploaded. No worker image publication, customer activation, ongoing review funding, Apple submission or AI DJ rental.

No additional aggregate budget is requested: preserve the original **$3 total**. Reserve **$1** for the stopped attempt (its entire original 40-minute plus shutdown envelope at the conservative 220-microdollar per second rate, plus $0.02 fixed allowance, is $0.5766). The new lease is capped at **$2**. Billing is still provisional; this conservative reserve is not a claim of actual cost. The owner explicitly approved the new window; its exact fixed deadline and early shutdown are recorded in execution.md.

The controller binds the corrected readiness source and prior zero-submission/cleanup receipt, enforces the $2 lease and original $3 aggregate allocation, and reserves at least 16 minutes after preparation. It never submits a warmup generation or repeats a song request. The normal app/account/upload/quote/submit/poll/download/ledger/privacy checks remain.

**PASS:** 206 site tests, 11 focused checks, 20 disposable-Postgres checks, site typecheck, both no-operation dry runs and harness typecheck. The regression fails before repair and passes afterward. These were the pre-execution checks. The approved attempt subsequently deployed and enabled min/max 1/1, but received no worker or generation. Cleanup passed; see the execution result above.
