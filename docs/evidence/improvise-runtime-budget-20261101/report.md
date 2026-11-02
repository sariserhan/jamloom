# Improvise runtime allocation — 2026-11-01 local date

**FAIL hosted runtime; PASS local preparation and independent cleanup; release PARTIAL.**

The approved additional request is consumed: one 33-second Improvise request timed out at 120.564 seconds. All ten test credits were released, both remote objects are absent, workers/jobs are zero and the held website is restored. No retry. [Completed execution](execution.md).

The previous two-request 4090 check delivered Music DNA successfully, but the 33-second Improvise case reached the worker's 100-second execution timeout. Both had only 21 ms of queue delay after active readiness. Improvise's 10 credits were released; Music DNA captured 20 test credits. Independent cleanup, unchanged live wallet and held-site restoration pass. [Actual results](../empty-exclusions-repair-20261101/execution.md).

## Change

Only the private 4090 diagnostic profile changes: Improvise execution is 120 seconds instead of 100. Total request TTL remains 130 seconds, giving 10 seconds of queue allowance. The conservative 380-microdollar/second rate, $0.02 fixed allowance and $0.0694 total reservation remain unchanged, as do the 10-credit price and $0.07 catalog ceiling. Budget fixed overhead changes from $0.0314 to $0.0238 so the same total funds the longer execution. No model, generator, source processing, musical-quality setting or production L4 deadline changes.

This is an allocation of existing reserved time, not proof of faster execution. Twenty additional seconds may still be insufficient. The failed worker only returned `worker-timeout`; its exact internal stage is unknown. No successful Improvise result or completed release is claimed.

## Bounded additional check

The owner explicitly approved the [plan](hosted-plan.json): “Approve one extra request within $3 total.” It authorizes one additional Improvise request on the existing accepted image. It does not repeat Music DNA. Use the same approved 1.22-second question crop, male voice and drum and bass, ordinary random 30–45-second output duration, one active RTX 4090, no retry, stop on failure, private audio and independent cleanup. A fresh 40-minute lease includes deployment/preparation, followed by at most 130 seconds shutdown. Local and hosted expiry guards remain mandatory.

The stage is capped at $1 within the original $3 aggregate, with $1 conservatively reserved for each of the two completed leases. Each whole 40-minute lease plus shutdown is bounded at $0.9814 under the enforced rate and fixed allowance, so those reservations do not assume missing invoices are zero. This explicitly requests a third generation across the campaign; the previous two request permits are consumed. Source `14b9d38a` was deployed for this finite check and the held deployment restored after failure. The fixed deadline was 2026-11-02 03:48:24.513 UTC plus shutdown; independent cleanup completed earlier at 03:27 UTC. The permit is CONSUMED.

## Validation

PASS: 208 site tests, 20 disposable PostgreSQL checks, site/harness typechecks, production build, bundle audit and both dry runs. The HTTP dry run verifies the actual pinned source format/hash and makes no provider calls. The plan binds application and harness hashes.

FAIL: the additional hosted request reached the 120-second worker timeout. PASS: independent cleanup, full test-credit release and held-site restoration. Full costs, viable customer/reviewer capacity and final sales/App Review activation remain open. The existing held website, closed sales, owner-closed studies and deferred research/scoring stay unchanged.
